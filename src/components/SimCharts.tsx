import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SimResult } from '../sim/types'

interface SimChartsProps {
  result: SimResult
}

export function SimCharts({ result }: SimChartsProps) {
  const data = result.equity.map((e) => ({
    i: e.i,
    bankroll: Number(e.bankroll.toFixed(2)),
    profit: Number(e.profit.toFixed(2)),
    date: e.date,
  }))

  return (
    <div className="panel" style={{ marginTop: '0.75rem' }}>
      <div className="section-head" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Bankroll over bets</h2>
          <p>Equity curve from flat-stake simulation.</p>
        </div>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5ddea0" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#5ddea0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(200,245,168,0.08)" vertical={false} />
            <XAxis
              dataKey="i"
              tick={{ fill: '#8aa891', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Bet #', position: 'insideBottomRight', fill: '#8aa891', offset: -2 }}
            />
            <YAxis
              tick={{ fill: '#8aa891', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: '#0b1f13',
                border: '1px solid rgba(200,245,168,0.2)',
                borderRadius: 10,
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { date?: string; i?: number } | undefined
                return p ? `Bet #${p.i} · ${p.date ?? ''}` : ''
              }}
            />
            <Area
              type="monotone"
              dataKey="bankroll"
              stroke="#c8f5a8"
              fill="url(#eqFill)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
