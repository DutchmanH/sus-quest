import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateRounds } from '@/lib/openai'
import type { Vibe, ContentLevel } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { roomCode } = await request.json()

    const supabase = await createServiceClient()

    // Load room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    // Load players
    const { data: players } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)

    const playerIds = players?.map((p: { id: string }) => p.id) ?? []
    const playerCount = playerIds.length

    if (playerCount < 2) {
      return NextResponse.json({ error: 'Minimaal 2 spelers nodig' }, { status: 400 })
    }

    // Update room status to generating
    await supabase
      .from('rooms')
      .update({ status: 'generating' })
      .eq('id', room.id)

    // Generate rounds via OpenAI
    const generatedRounds = await generateRounds(
      room.rounds_total,
      room.vibe as Vibe,
      room.content_level as ContentLevel,
      playerCount
    )

    // Save rounds to database
    const roundsToInsert = generatedRounds.map((round, index) => {
      const sidequestPlayerId = round.hasSidequest && round.sidequest
        ? playerIds[round.sidequest.playerIndex % playerCount]
        : null

      return {
        room_id: room.id,
        round_number: index + 1,
        main_question_nl: round.mainQuestion.nl,
        main_question_en: round.mainQuestion.en,
        has_sidequest: round.hasSidequest,
        sidequest_player_id: sidequestPlayerId,
        sidequest_nl: round.sidequest?.text.nl ?? null,
        sidequest_en: round.sidequest?.text.en ?? null,
        fake_task_nl: round.fakeTask.nl,
        fake_task_en: round.fakeTask.en,
        status: index === 0 ? 'active' : 'pending',
      }
    })

    const { error: insertError } = await supabase
      .from('rounds')
      .insert(roundsToInsert)

    if (insertError) throw insertError

    // Update room to playing, current_round = 1
    await supabase
      .from('rooms')
      .update({ status: 'playing', current_round: 1 })
      .eq('id', room.id)

    return NextResponse.json({ success: true, roundCount: roundsToInsert.length })
  } catch (err) {
    console.error('Generate error:', err)

    // Reset room status on error
    try {
      const supabase = await createServiceClient()
      const { roomCode } = await request.clone().json()
      await supabase.from('rooms').update({ status: 'settings' }).eq('code', roomCode)
    } catch {}

    return NextResponse.json({ error: 'Genereren mislukt' }, { status: 500 })
  }
}
