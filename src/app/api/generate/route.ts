import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isRoomExpired } from '@/lib/game-expiry'
import { generateRounds } from '@/lib/openai'
import { resolveSeasonalContext } from '@/lib/seasonal-events'

const MAX_REGENERATIONS_PER_GAME = 3

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

    // Allow initial generation + max 3 regenerations.
    const { count: generationCount } = await supabase
      .from('game_generation_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    const usedGenerations = generationCount ?? 0
    const usedRegenerations = Math.max(0, usedGenerations - 1)
    if (usedRegenerations >= MAX_REGENERATIONS_PER_GAME) {
      return NextResponse.json(
        {
          error: `Je hebt het maximum van ${MAX_REGENERATIONS_PER_GAME}x opnieuw genereren bereikt voor deze game.`,
          code: 'REGEN_LIMIT_REACHED',
        },
        { status: 429 }
      )
    }

    if (isRoomExpired(room)) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
      return NextResponse.json({ error: 'Deze game is verlopen.', code: 'GAME_EXPIRED' }, { status: 410 })
    }

    // Delete existing rounds so the host can regenerate freely
    await supabase.from('rounds').delete().eq('room_id', room.id)
    await supabase.from('rooms').update({ status: 'generating' }).eq('id', room.id)

    // Player count is unknown at generation time; use 4 as a sensible default
    // for the AI prompt context. Actual player assignment happens at game start.
    const questionsPerCycle = Math.max(1, Number(room.questions_per_cycle ?? 4))
    const playCycles = Math.max(1, Number(room.play_cycles ?? Math.ceil((room.rounds_total ?? 10) / questionsPerCycle)))
    const totalQuestions = questionsPerCycle * playCycles

    const { rounds: generatedRounds, usage } = await generateRounds(
      totalQuestions,
      room.vibe,
      room.content_level,
      4,
      room.groep,
      resolveSeasonalContext({ manualTheme: room.seasonal_theme ?? null })
    )

    if (!Array.isArray(generatedRounds) || generatedRounds.length === 0) {
      throw new Error(`OpenAI returned invalid rounds: ${JSON.stringify(generatedRounds)}`)
    }

    const roundsToInsert: Record<string, unknown>[] = []
    let roundNumber = 1
    let questionIndex = 0

    roundsToInsert.push({
      room_id: room.id,
      round_number: roundNumber++,
      main_question_nl: 'Lees je geheime kaart en maak je klaar.',
      main_question_en: 'Read your secret card and get ready.',
      has_sidequest: true,
      sidequest_player_id: null,
      sidequest_nl: 'Open de ronde met een subtiele verdachte actie zonder dat het opvalt.',
      sidequest_en: 'Start the round with a subtle suspicious action without being obvious.',
      fake_task_nl: 'Check je rol en speel slim.',
      fake_task_en: 'Check your role and play smart.',
      status: 'pending',
      round_kind: 'intro',
    })

    for (let cycle = 0; cycle < playCycles; cycle++) {
      const cycleSidequestNl = generatedRounds[questionIndex]?.sidequest?.text?.nl ?? 'Doe iets verdachts maar subtiel.'
      const cycleSidequestEn = generatedRounds[questionIndex]?.sidequest?.text?.en ?? 'Do something suspicious, but subtle.'

      for (let question = 0; question < questionsPerCycle; question++) {
        const generated = generatedRounds[questionIndex]
        const hasSidequest = question === 0
        roundsToInsert.push({
          room_id: room.id,
          round_number: roundNumber++,
          main_question_nl: generated?.mainQuestion?.nl ?? 'Vraag',
          main_question_en: generated?.mainQuestion?.en ?? 'Question',
          has_sidequest: hasSidequest,
          sidequest_player_id: null,
          sidequest_nl: cycleSidequestNl,
          sidequest_en: cycleSidequestEn,
          fake_task_nl: generated?.fakeTask?.nl ?? 'Doe niets opvallends.',
          fake_task_en: generated?.fakeTask?.en ?? 'Do nothing suspicious.',
          status: 'pending',
          round_kind: 'play',
        })
        questionIndex += 1
      }

      roundsToInsert.push({
        room_id: room.id,
        round_number: roundNumber++,
        main_question_nl: 'Verdacht moment: kies wie jij vertrouwt.',
        main_question_en: 'Suspicion moment: pick who you trust.',
        has_sidequest: false,
        sidequest_player_id: null,
        sidequest_nl: null,
        sidequest_en: null,
        fake_task_nl: 'Kies je verdachte.',
        fake_task_en: 'Choose your suspect.',
        status: 'pending',
        round_kind: 'accuse_gate',
      })
    }

    let { error: insertError } = await supabase.from('rounds').insert(roundsToInsert)
    if (insertError && (insertError.message?.includes('round_kind') ?? false)) {
      const fallbackRows = roundsToInsert.map(({ round_kind, ...row }) => row)
      const fallbackInsert = await supabase.from('rounds').insert(fallbackRows)
      insertError = fallbackInsert.error
    }
    if (insertError) throw insertError

    // Log token usage and estimated model costs for admin analytics.
    const { error: metricsError } = await supabase
      .from('game_generation_metrics')
      .insert({
        room_id: room.id,
        host_user_id: user.id,
        model: usage.model,
        rounds_requested: totalQuestions,
        rounds_generated: roundsToInsert.length,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
        input_cost_usd: usage.inputCostUsd,
        output_cost_usd: usage.outputCostUsd,
        total_cost_usd: usage.totalCostUsd,
      })
    if (metricsError) {
      console.error('Metrics insert error:', metricsError.message)
    }

    // Back to lobby — players will join after the host approves the preview
    const roomUpdate = await supabase
      .from('rooms')
      .update({ status: 'lobby', rounds_total: totalQuestions, play_cycles: playCycles, questions_per_cycle: questionsPerCycle })
      .eq('id', room.id)
    if (roomUpdate.error) {
      const missingColumns =
        roomUpdate.error.message?.includes('play_cycles') ||
        roomUpdate.error.message?.includes('questions_per_cycle')
      if (missingColumns) {
        await supabase
          .from('rooms')
          .update({ status: 'lobby', rounds_total: totalQuestions })
          .eq('id', room.id)
      } else {
        await supabase
          .from('rooms')
          .update({ status: 'lobby' })
          .eq('id', room.id)
      }
    }

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
