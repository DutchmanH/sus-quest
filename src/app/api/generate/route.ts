import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isRoomExpired } from '@/lib/game-expiry'
import { generateRounds } from '@/lib/openai'
import { resolveSeasonalContext } from '@/lib/seasonal-events'

const SIDEQUEST_CHANCE = 0.7

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let roomCode: string
  try {
    roomCode = (await request.json()).roomCode
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }
  if (!roomCode) return NextResponse.json({ error: 'roomCode is verplicht' }, { status: 400 })

  const supabase = await createServiceClient()

  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms').select('*').eq('code', roomCode.toUpperCase()).single()

    if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan vragen genereren' }, { status: 403 })

    if (isRoomExpired(room)) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
      return NextResponse.json({ error: 'Deze game is verlopen.', code: 'GAME_EXPIRED' }, { status: 410 })
    }

    // Delete existing rounds so the host can regenerate freely
    await supabase.from('rounds').delete().eq('room_id', room.id)
    await supabase.from('rooms').update({ status: 'generating' }).eq('id', room.id)

    // Player count is unknown at generation time; use 4 as a sensible default
    // for the AI prompt context. Actual player assignment happens at game start.
    const generatedRounds = await generateRounds(
      room.rounds_total,
      room.vibe,
      room.content_level,
      4,
      room.groep,
      resolveSeasonalContext({ manualTheme: room.seasonal_theme ?? null })
    )

    if (!Array.isArray(generatedRounds) || generatedRounds.length === 0) {
      throw new Error(`OpenAI returned invalid rounds: ${JSON.stringify(generatedRounds)}`)
    }

    const roundsToInsert = generatedRounds.map((round, index) => {
      const hasSidequest = Math.random() < SIDEQUEST_CHANCE
      return {
      room_id: room.id,
      round_number: index + 1,
      main_question_nl: round.mainQuestion?.nl ?? 'Vraag',
      main_question_en: round.mainQuestion?.en ?? 'Question',
      // Product rule: per round independently 70% chance on sidequest.
      // Only one player can get the sidequest later via sidequest_player_id.
      has_sidequest: hasSidequest,
      sidequest_player_id: null, // assigned when game actually starts
      sidequest_nl: hasSidequest ? (round.sidequest?.text?.nl ?? 'Doe iets verdachts maar subtiel.') : null,
      sidequest_en: hasSidequest ? (round.sidequest?.text?.en ?? 'Do something suspicious, but subtle.') : null,
      fake_task_nl: round.fakeTask?.nl ?? 'Doe niets opvallends.',
      fake_task_en: round.fakeTask?.en ?? 'Do nothing suspicious.',
      status: 'pending',
      }
    })

    const { error: insertError } = await supabase.from('rounds').insert(roundsToInsert)
    if (insertError) throw insertError

    // Back to lobby — players will join after the host approves the preview
    await supabase.from('rooms').update({ status: 'lobby' }).eq('id', room.id)

    return NextResponse.json({ success: true, roundCount: roundsToInsert.length })
  } catch (err) {
    console.error('Generate error:', err instanceof Error ? err.message : err)
    console.error('Generate stack:', err instanceof Error ? err.stack : 'no stack')
    try {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('code', roomCode.toUpperCase())
    } catch {}
    return NextResponse.json({ error: 'Genereren mislukt' }, { status: 500 })
  }
}
