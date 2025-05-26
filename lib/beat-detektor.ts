/**
 * BeatDetektor.js
 * v0.2 for JavaScript
 * Ported from BeatDetektor 0.1 for ActionScript 3
 * Copyright (c) 2009-2015, Sonic Bloom
 * All rights reserved.
 * http://sonicbloom.net/
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the <ORGANIZATION> nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export class BeatDetektor {
  static config_default = {
    BD_DETECTION_RANGES: 5,
    BD_DETECTION_RATE: 12.0,
    BD_DETECTION_FACTOR: 0.915,
    BD_QUALITY_DECAY: 0.5,
    BD_QUALITY_TOLERANCE: 0.96,
    BD_QUALITY_REWARD: 5.0,
    BD_QUALITY_STEP: 0.1,
    BD_MINIMUM_CONTRIBUTIONS: 6,
    BD_FINISH_LINE: 60.0,
    BD_REWARD_TOLERANCES: [0.001, 0.005, 0.01, 0.02, 0.04, 0.08, 0.1, 0.15, 0.3],
    BD_REWARD_MULTIPLIERS: [20.0, 10.0, 8.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  }

  BPM_MIN = 60.0
  BPM_MAX = 200.0

  current_bpm = 0.0
  winning_bpm = 0.0
  winning_bpm_contest_start = 0.0
  quality_total = 0.0
  quality_average = 0.0
  detection_ranges = 0
  detection_rate = 0.0
  detection_factor = 0.0
  quality_decay = 0.0
  quality_tolerance = 0.0
  quality_reward = 0.0
  quality_step = 0.0
  current_contest = 0
  minimum_contributions = 0
  finish_line = 0.0
  total_time = 0.0
  last_update = 0.0
  last_detection = 0.0
  ma_quality_avg = 0.0
  ma_quality_total = 0.0
  ma_bpm_range = 0.0
  ma_bpm_contest = 0.0
  ma_bpm_contest_start = 0.0
  ma_bpm_contest_prev = 0.0
  bpm_contest = []
  bpm_contest_lo = []
  reward_tolerances = []
  reward_multipliers = []
  half_time_multiplier = 1.0
  double_time_multiplier = 1.0

  constructor(bpm_minimum = 60.0, bpm_maximum = 200.0, config = BeatDetektor.config_default) {
    this.BPM_MIN = bpm_minimum
    this.BPM_MAX = bpm_maximum

    this.detection_ranges = config.BD_DETECTION_RANGES || 5
    this.detection_rate = config.BD_DETECTION_RATE || 12.0
    this.detection_factor = config.BD_DETECTION_FACTOR || 0.915
    this.quality_decay = config.BD_QUALITY_DECAY || 0.5
    this.quality_tolerance = config.BD_QUALITY_TOLERANCE || 0.96
    this.quality_reward = config.BD_QUALITY_REWARD || 5.0
    this.quality_step = config.BD_QUALITY_STEP || 0.1
    this.minimum_contributions = config.BD_MINIMUM_CONTRIBUTIONS || 6
    this.finish_line = config.BD_FINISH_LINE || 60.0
    this.reward_tolerances = config.BD_REWARD_TOLERANCES || [0.001, 0.005, 0.01, 0.02, 0.04, 0.08, 0.1, 0.15, 0.3]
    this.reward_multipliers = config.BD_REWARD_MULTIPLIERS || [20.0, 10.0, 8.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]

    this.reset()
  }

  reset() {
    this.current_bpm = 0.0
    this.winning_bpm = 0.0
    this.winning_bpm_contest_start = 0.0
    this.quality_total = 0.0
    this.quality_average = 0.0
    this.current_contest = 0
    this.total_time = 0.0
    this.last_update = 0.0
    this.last_detection = 0.0
    this.ma_quality_avg = 0.0
    this.ma_quality_total = 0.0
    this.ma_bpm_range = 0.0
    this.ma_bpm_contest = 0.0
    this.ma_bpm_contest_start = 0.0
    this.ma_bpm_contest_prev = 0.0

    this.bpm_contest = []
    this.bpm_contest_lo = []

    for (let i = 0; i < this.detection_ranges; i++) {
      this.bpm_contest[i] = 0.0
      this.bpm_contest_lo[i] = 0.0
    }
  }

  process(timer_seconds: number, fft_data: number[]) {
    if (this.last_update === 0.0) {
      this.last_update = timer_seconds
      return 0.0
    }

    // Only process if we have a reasonable sample to work with
    if (fft_data.length < 3) return 0.0

    const delta = timer_seconds - this.last_update
    this.last_update = timer_seconds
    this.total_time += delta

    // Get the current energy level (rms)
    let rms = 0.0
    for (let i = 0; i < fft_data.length; i++) {
      rms += fft_data[i] * fft_data[i]
    }
    rms = Math.sqrt(rms / fft_data.length)

    // Compute a moving average of the energy
    const avg_energy = this.ma_quality_avg + (rms - this.ma_quality_avg) * delta * 10.0
    this.ma_quality_avg = avg_energy

    // Only process if we have a significant energy reading
    if (rms < 0.001) return 0.0

    // Compute a moving average of the quality
    const quality = Math.min(Math.max(rms / avg_energy, 0.5), 1.5)
    this.ma_quality_total += (quality - this.ma_quality_total) * delta * 2.0

    // Check for a beat
    if (
      quality >= this.ma_quality_total * this.quality_tolerance &&
      timer_seconds - this.last_detection >= 60.0 / this.BPM_MAX
    ) {
      this.last_detection = timer_seconds

      // Process the beat
      this.process_beat(timer_seconds)
    }

    // Update the winning BPM
    this.process_winning_bpm(timer_seconds)

    return this.current_bpm
  }

  process_beat(timer_seconds: number) {
    if (this.last_detection === 0.0) {
      this.last_detection = timer_seconds
      return
    }

    const time_delta = timer_seconds - this.last_detection
    const bpm_floor = Math.max(this.BPM_MIN, 60.0 / time_delta)
    const bpm_ceil = Math.min(this.BPM_MAX, bpm_floor * 2.0)

    // Process the ranges
    for (let i = 0; i < this.detection_ranges; i++) {
      const bpm_range = bpm_floor + (bpm_ceil - bpm_floor) * (i / this.detection_ranges)
      const bpm_delta = Math.abs(this.ma_bpm_range - bpm_range)
      const weight = 1.0 - bpm_delta * 0.01

      if (weight > 0.0) {
        this.bpm_contest[i] += weight
      }
    }

    // Find the winning range
    let win_bpm_range = 0.0
    let win_bpm_contest = 0.0

    for (let i = 0; i < this.detection_ranges; i++) {
      if (this.bpm_contest[i] > win_bpm_contest) {
        win_bpm_contest = this.bpm_contest[i]
        win_bpm_range = bpm_floor + (bpm_ceil - bpm_floor) * (i / this.detection_ranges)
      }
    }

    // Update the moving average
    this.ma_bpm_range += (win_bpm_range - this.ma_bpm_range) * this.detection_factor
    this.ma_bpm_contest += (win_bpm_contest - this.ma_bpm_contest) * this.detection_factor

    // Update the current BPM
    this.current_bpm = this.ma_bpm_range
  }

  process_winning_bpm(timer_seconds: number) {
    // Check if we have a winning BPM
    if (this.ma_bpm_contest > this.minimum_contributions && this.ma_bpm_contest > this.ma_bpm_contest_start) {
      this.ma_bpm_contest_start = this.ma_bpm_contest
      this.winning_bpm = this.current_bpm
      this.winning_bpm_contest_start = timer_seconds
    }

    // Decay the contest
    this.ma_bpm_contest *= Math.pow(this.detection_factor, 10.0 * (timer_seconds - this.winning_bpm_contest_start))
  }

  current_bpm_valid() {
    return this.current_bpm > 0.0
  }

  winning_bpm_valid() {
    return this.winning_bpm > 0.0
  }
}

export class BeatDetektorRenderingContext {
  canvas_ctx: CanvasRenderingContext2D
  width: number
  height: number
  palette: string[]

  constructor(canvas_context: CanvasRenderingContext2D, width: number, height: number) {
    this.canvas_ctx = canvas_context
    this.width = width
    this.height = height

    // Default palette
    this.palette = [
      "#930000",
      "#935100",
      "#939200",
      "#619300",
      "#00930B",
      "#009379",
      "#004D93",
      "#000093",
      "#4B0093",
      "#93004D",
      "#FF0000",
      "#FF8C00",
      "#FFFA00",
      "#A9FF00",
      "#00FF13",
      "#00FFD0",
      "#0085FF",
      "#0000FF",
      "#8300FF",
      "#FF0085",
      "#FF0000",
    ]
  }

  renderBeatGrid(
    bd: BeatDetektor,
    timer_seconds: number,
    offset_x: number,
    offset_y: number,
    width: number,
    height: number,
  ) {
    const ctx = this.canvas_ctx
    const bpm_avg = bd.winning_bpm_valid() ? bd.winning_bpm : bd.current_bpm

    if (!bd.current_bpm_valid()) return

    // Draw grid
    const step = 60.0 / bpm_avg
    const offset = (timer_seconds % step) / step

    ctx.save()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let i = 0; i < width; i += step * 50) {
      const x = offset_x + i - offset * step * 50
      ctx.beginPath()
      ctx.moveTo(x, offset_y)
      ctx.lineTo(x, offset_y + height)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i < height; i += 20) {
      const y = offset_y + i
      ctx.beginPath()
      ctx.moveTo(offset_x, y)
      ctx.lineTo(offset_x + width, y)
      ctx.stroke()
    }

    // Draw beat markers
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
    for (let i = 0; i < width; i += step * 50) {
      const x = offset_x + i - offset * step * 50
      ctx.beginPath()
      ctx.arc(x, offset_y + height / 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw BPM text
    ctx.fillStyle = "white"
    ctx.font = "12px Arial"
    ctx.fillText(`${Math.round(bpm_avg)} BPM`, offset_x + 10, offset_y + 15)

    ctx.restore()
  }

  renderFFT(bd: BeatDetektor, fft_data: number[], offset_x: number, offset_y: number, width: number, height: number) {
    if (!fft_data || fft_data.length === 0) return

    const ctx = this.canvas_ctx
    const bar_width = width / fft_data.length

    ctx.save()

    // Draw FFT bars
    for (let i = 0; i < fft_data.length; i++) {
      const value = fft_data[i]
      const bar_height = value * height
      const x = offset_x + i * bar_width
      const y = offset_y + height - bar_height

      // Color gradient based on frequency
      const color_idx = Math.floor((i / fft_data.length) * (this.palette.length - 1))
      ctx.fillStyle = this.palette[color_idx]

      ctx.fillRect(x, y, bar_width, bar_height)
    }

    ctx.restore()
  }
}
