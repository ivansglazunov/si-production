import { useState, useRef, useMemo, memo } from 'react'
import { useMotionValueEvent } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Label } from 'recharts'

// Функция для генерации демо данных для успешной киновселенной с скачкообразным ростом
function generateDemoData(maxMonths) {
  const data = []

  // Месяцы запуска рекламных кампаний (каждые 3-6 месяцев)
  const campaignMonths = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
  // Месяцы релизов новых частей франшизы
  const releaseMonths = [1, 7, 13, 19, 25, 31]

  // Базовые значения для каждого месяца
  let baseVK = 5
  let baseTwitter = 2
  let baseYouTube = 20
  let baseStreaming = 0.5
  let baseCinemas = 100
  let baseMerch = 1

  for (let month = 1; month <= maxMonths; month++) {
    const timeLabel = month <= 12
      ? `${month} мес`
      : month <= 24
        ? `${Math.floor(month / 12)} г ${month % 12} мес`
        : `${Math.floor(month / 12)} г`

    // Определяем текущий уровень кампаний (сколько кампаний прошло)
    const campaignsCompleted = campaignMonths.filter(m => m <= month).length
    // Определяем текущий уровень релизов
    const releasesCompleted = releaseMonths.filter(m => m <= month).length

    // Скачки от рекламных кампаний (каждые 3 месяца)
    const campaignMultiplier = 1 + (campaignsCompleted * 0.3) + (campaignMonths.includes(month) ? 0.8 : 0)
    // Скачки от новых релизов (каждые 6 месяцев)
    const releaseMultiplier = 1 + (releasesCompleted * 0.5) + (releaseMonths.includes(month) ? 1.5 : 0)

    // Базовый рост + скачки
    baseVK = Math.max(5, baseVK + (month <= 12 ? 2 : 1.5) + (campaignMonths.includes(month) ? 15 : 0))
    baseTwitter = Math.max(2, baseTwitter + (month <= 18 ? 1 : 0.8) + (campaignMonths.includes(month) ? 8 : 0))
    baseYouTube = Math.max(20, baseYouTube + (month <= 10 ? 25 : 15) + (releaseMonths.includes(month) ? 50 : 0))
    baseStreaming = Math.max(0.5, baseStreaming + (month <= 8 ? 1.5 : 1) + (campaignMonths.includes(month) ? 5 : 0))
    baseCinemas = Math.max(100, baseCinemas + (month <= 24 ? 45 : 25) + (releaseMonths.includes(month) ? 120 : 0))
    baseMerch = Math.max(1, baseMerch + (month <= 30 ? 2 : 1) + (releaseMonths.includes(month) ? 8 : 0))

    // Применяем множители для скачков
    const vk = baseVK * campaignMultiplier
    const twitter = baseTwitter * campaignMultiplier
    const youtube = baseYouTube * releaseMultiplier
    const streaming = baseStreaming * campaignMultiplier
    const cinemas = baseCinemas * releaseMultiplier
    const merch = baseMerch * releaseMultiplier

    // Онлайн кино = часть YouTube + часть стриминга + дополнительные просмотры
    const onlineCinema = Math.max(10, (youtube * 0.3) + (streaming * 2) + (month <= 6 ? month * 15 : 90 + (month - 6) * 8))

    // Охват аудитории = кинотеатры + онлайн кино + соцсети + дополнительные каналы
    const audienceReach = Math.max(50,
      (cinemas * 0.05) + // Каждый показ достигает ~50 человек
      onlineCinema + // Прямые просмотры
      vk + twitter + // Соцсети
      (month <= 12 ? month * 8 : 96 + (month - 12) * 4) // Дополнительные каналы
    )

    data.push({
      month,
      timeLabel,
      'Охват аудитории': Math.max(50, Math.min(500, Math.round(audienceReach * 10) / 10)),
      'Кинотеатры': Math.max(100, Math.min(2000, Math.round(cinemas))),
      'Онлайн кино': Math.max(10, Math.min(1000, Math.round(onlineCinema * 10) / 10)),
      'VK': Math.max(5, Math.min(200, Math.round(vk * 10) / 10)),
      'Twitter': Math.max(2, Math.min(100, Math.round(twitter * 10) / 10)),
      'YouTube': Math.max(20, Math.min(2000, Math.round(youtube * 10) / 10)),
      'Мерч': Math.max(1, Math.min(100, Math.round(merch * 10) / 10)),
      'Стриминг': Math.max(0.5, Math.min(50, Math.round(streaming * 10) / 10))
    })
  }

  return data
}

function CinemaProductionProgress({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const lastUpdateRef = useRef(0)

  // Максимальное количество месяцев (3 года = 36 месяцев)
  const maxMonths = 36

  // Оптимизация: дебаунсинг обновлений диаграммы (увеличен до 200ms для меньшего количества обновлений)
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const now = Date.now()
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)

    if (now - lastUpdateRef.current > 200 && Math.abs(progressPercent - progress) > 2) {
      setProgress(progressPercent)
      lastUpdateRef.current = now
    }
  })

  // Мемоизируем вычисление видимых месяцев
  const visibleMonths = useMemo(() =>
    Math.max(3, Math.min(maxMonths, Math.ceil(3 + (progress / 100) * (maxMonths - 3)))),
    [progress, maxMonths]
  )

  // Мемоизируем генерацию всех данных (для maxYValue) - один раз
  const allData = useMemo(() => generateDemoData(maxMonths), [maxMonths])

  // Мемоизируем вычисление максимального значения Y
  const yAxisMax = useMemo(() => {
    const maxYValue = Math.max(
      ...allData.flatMap(d => [
        d['Охват аудитории'],
        d['Кинотеатры'],
        d['Онлайн кино'],
        d['VK'],
        d['Twitter'],
        d['YouTube'],
        d['Мерч'],
        d['Стриминг']
      ])
    )
    return Math.ceil(maxYValue * 1.1)
  }, [allData])

  // Мемоизируем генерацию данных для видимых месяцев
  const data = useMemo(() => generateDemoData(visibleMonths), [visibleMonths])

  // Мемоизируем цвета для каждой метрики - почти белые с небольшим оттенком
  const colors = useMemo(() => ({
    'Охват аудитории': '#f8f8f8', // Почти белый с легким серым оттенком
    'Кинотеатры': '#fafafa', // Белый с минимальным серым
    'Онлайн кино': '#f5f5f5', // Белый с чуть более серым
    'VK': '#f9f9f9', // Белый с легким оттенком
    'Twitter': '#f7f7f7', // Белый с небольшим серым
    'YouTube': '#fbfbfb', // Почти чисто белый
    'Мерч': '#f6f6f6', // Белый с серым оттенком
    'Стриминг': '#fcfcfc' // Почти чисто белый
  }), [])

  // Мемоизируем позиции лейблов
  const labelPositions = useMemo(() => ({
    'Охват аудитории': { dataIndexPercent: 0.70, offsetX: 10, offsetY: 0, anchor: 'start' },
    'Кинотеатры': { dataIndexPercent: 0.50, offsetX: 0, offsetY: -15, anchor: 'middle' },
    'Онлайн кино': { dataIndexPercent: 0.85, offsetX: -5, offsetY: 0, anchor: 'end' },
    'VK': { dataIndexPercent: 0.35, offsetX: 0, offsetY: 15, anchor: 'middle' },
    'Twitter': { dataIndexPercent: 0.60, offsetX: 0, offsetY: -15, anchor: 'middle' },
    'YouTube': { dataIndexPercent: 0.90, offsetX: -5, offsetY: 0, anchor: 'end' },
    'Мерч': { dataIndexPercent: 0.25, offsetX: 0, offsetY: 15, anchor: 'middle' },
    'Стриминг': { dataIndexPercent: 0.75, offsetX: 0, offsetY: -15, anchor: 'middle' }
  }), [])
  
  
  // Кастомный компонент для лейбла
  const CustomLabel = (props) => {
    const { x, y, index, name } = props
    if (!x || !y || !name) return null
    
    const labelConfig = labelPositions[name]
    if (!labelConfig) return null
    
    // Вычисляем целевой индекс для этой метрики
    const targetIndex = Math.floor(data.length * labelConfig.dataIndexPercent)
    
    // Показываем лейбл только на целевой позиции
    if (index !== targetIndex) return null
    
    // Проверяем, не выходит ли за границы (с учетом offset)
    const labelX = Number(x) + labelConfig.offsetX
    const labelY = Number(y) + labelConfig.offsetY
    
    return (
      <g>
        <text
          x={labelX}
          y={labelY}
          fill={colors[name]}
          fontSize={14}
          fontWeight="bold"
          textAnchor={labelConfig.anchor}
          style={{ pointerEvents: 'none' }}
        >
          {name}
        </text>
      </g>
    )
  }
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'absolute',
      top: 0,
      left: 0,
      padding: 0,
      zIndex: 1,
      pointerEvents: 'none'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: -50, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="timeLabel"
            height={0}
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <YAxis
            domain={[0, yAxisMax]}
            width={0}
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              borderRadius: '8px'
            }}
            formatter={(value, name) => {
              // Форматируем значения в зависимости от метрики
              if (name === 'Охват аудитории' || name === 'Онлайн кино' || name === 'VK' || name === 'Twitter' || name === 'YouTube' || name === 'Стриминг') {
                return [`${value} млн`, name]
              } else if (name === 'Кинотеатры') {
                return [`${value} показов`, name]
              } else if (name === 'Мерч') {
                return [`${value} тыс. ед.`, name]
              }
              return [value, name]
            }}
          />
          {/* Залитые кривые для каждой метрики с лейблами на последних точках */}
          <Area
            type="monotone"
            dataKey="Охват аудитории"
            stroke={colors['Охват аудитории']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Охват аудитории" />}
          />
          <Area
            type="monotone"
            dataKey="Кинотеатры"
            stroke={colors['Кинотеатры']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Кинотеатры" />}
          />
          <Area
            type="monotone"
            dataKey="Онлайн кино"
            stroke={colors['Онлайн кино']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Онлайн кино" />}
          />
          <Area
            type="monotone"
            dataKey="VK"
            stroke={colors['VK']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="VK" />}
          />
          <Area
            type="monotone"
            dataKey="Twitter"
            stroke={colors['Twitter']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Twitter" />}
          />
          <Area
            type="monotone"
            dataKey="YouTube"
            stroke={colors['YouTube']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="YouTube" />}
          />
          <Area
            type="monotone"
            dataKey="Мерч"
            stroke={colors['Мерч']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Мерч" />}
          />
          <Area
            type="monotone"
            dataKey="Стриминг"
            stroke={colors['Стриминг']}
            strokeWidth={2}
            strokeOpacity={0.5}
            fill="none"
            label={(props) => <CustomLabel {...props} name="Стриминг" />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Мемоизируем компонент для предотвращения лишних перерендеров
export default memo(CinemaProductionProgress)
