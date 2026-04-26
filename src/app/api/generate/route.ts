import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateRounds } from '@/lib/openai'
import type { Vibe, ContentLevel } from '@/types'

export async function POST(request: NextRequest) {
  // Auth check — must be logged in to trigger generation
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  // Parse body once, before try-catch so roomCode is available for error recovery
  let roomCode: string
  try {
    const body = await request.json()
    roomCode = body.roomCode
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  if (!roomCode) {
    return NextResponse.json({ error: 'roomCode is verplicht' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    // Load room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    // Verify the caller is the host
    if (room.host_id !== user.id) {
      return NextResponse.json({ error: 'Alleen de host kan het spel starten' }, { status: 403 })
    }

    // Load players and set status in parallel
    const [{ data: players }] = await Promise.all([
      supabase.from('room_players').select('id').eq('room_id', room.id),
      supabase.from('rooms').update({ status: 'generating' }).eq('id', room.id),
    ])

    const playerIds = players?.map((p: { id: string }) => p.id) ?? []
    const playerCount = playerIds.length

    if (playerCount < 2) {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('id', room.id)
      return NextResponse.json({ error: 'Minimaal 2 spelers nodig' }, { status: 400 })
    }

    // Generate rounds via OpenAI
    const generatedRounds = await generateRounds(
      room.rounds_total,
      room.vibe as Vibe,
      room.content_level as ContentLevel,
      playerCount
    )

    if (!Array.isArray(generatedRounds) || generatedRounds.length === 0) {
      throw new Error(`OpenAI returned invalid rounds: ${JSON.stringify(generatedRounds)}`)
    }

    // Save rounds to database
    const roundsToInsert = generatedRounds.map((round, index) => {
      const sidequestPlayerId = round.hasSidequest && round.sidequest
        ? playerIds[round.sidequest.playerIndex % playerCount]
        : null

      return {
        room_id: room.id,
        round_number: index + 1,
        main_question_nl: round.mainQuestion?.nl ?? 'Vraag',
        main_question_en: round.mainQuestion?.en ?? 'Question',
        has_sidequest: round.hasSidequest ?? false,
        sidequest_player_id: sidequestPlayerId,
        sidequest_nl: round.sidequest?.text?.nl ?? null,
        sidequest_en: round.sidequest?.text?.en ?? null,
        fake_task_nl: round.fakeTask?.nl ?? 'Doe niets opvallends.',
        fake_task_en: round.fakeTask?.en ?? 'Do nothing suspicious.',
        status: index === 0 ? 'active' : 'pending',
      }
    })

    const { error: insertError } = await supabase.from('rounds').insert(roundsToInsert)
    if (insertError) throw insertError

    await supabase.from('rooms').update({ status: 'playing', current_round: 1 }).eq('id', room.id)

    return NextResponse.json({ success: true, roundCount: roundsToInsert.length })
  } catch (err) {
    console.error('Generate error:', err instanceof Error ? err.message : err)
    console.error('Generate stack:', err instanceof Error ? err.stack : 'no stack')

    // Reset room to lobby so host can retry — roomCode is already parsed above
    try {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('code', roomCode.toUpperCase())
    } catch {}

    return NextResponse.json({ error: 'Genereren mislukt' }, { status: 500 })
  }
}
