import { Spinner } from '../ui/Spinner'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg?: string
  trend?: { value: string; positive: boolean }
  loading?: boolean
}

export function StatsCard({ title, value, subtitle, icon, iconBg = 'bg-brand-500', trend, loading }: StatsCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {loading ? (
          <Spinner size="sm" className="mt-1 text-brand-400" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
        )}
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        {trend && !loading && (
          <p className={`text-xs font-medium mt-1 ${trend.positive ? 'text-green-600' : 'text-red-500'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </div>
  )
}
