import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate, useMotionValueEvent } from 'framer-motion'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'

export default function Home() {
  const [grid, setGrid] = useState([])
  const [stars] = useState(() => {
    // Генерируем случайные позиции для звезд
    const starsArray = []
    for (let i = 0; i < 100; i++) {
      starsArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 2
      })
    }
    return starsArray
  })
  const firstScreenRef = useRef(null)
  const secondScreenRef = useRef(null)
  const thirdScreenRef = useRef(null)

  // Фильмы для слайдера
  const movies = [
    'Дюна: Часть вторая',
    'Гладиатор 2',
    'Веном 3',
    'Мстители: Секретные войны',
    'Стражи Галактики. Часть 3',
    'Форсаж 11',
    'Человек-паук: Без пути домой',
    'Трансформеры: Возрождение',
    'Аквамен и потерянное царство',
    'Кунг-фу Панда 4'
  ]

  // Партнеры
  const partners = [
    'СТВ',
    'Мосфильм',
    'ТриТэ',
    'Киностудия им. Горького',
    'Централ Партнершип'
  ]

  // 15 вариантов данных для RadarChart со случайными значениями
  const radarDataVariants = (() => {
    const variants = []
    const subjects = ['Качество', 'Скорость', 'Бюджет', 'Креативность', 'Технологии', 'Команда']
    for (let i = 0; i < 15; i++) {
      variants.push(subjects.map(subject => ({
        subject,
        A: Math.floor(Math.random() * 100) + 30, // Случайное значение от 30 до 130
        fullMark: 150
      })))
    }
    return variants
  })()

  // Состояние для текущих данных RadarChart
  const [radarData, setRadarData] = useState(radarDataVariants[0])
  // Состояние для индекса активного датасета
  const [activeRadarDatasetIndex, setActiveRadarDatasetIndex] = useState(0)

  // 10 вариантов данных для RadialBarChart со случайными значениями
  const radialDataVariants = (() => {
    const variants = []
    const baseNames = ['Проекты', 'Партнеры', 'Опыт', 'Репутация']
    const baseFills = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042']
    for (let i = 0; i < 10; i++) {
      variants.push(baseNames.map((name, idx) => ({
        name,
        value: Math.floor(Math.random() * 60) + 40, // Случайное значение от 40 до 100
        fill: baseFills[idx]
      })))
    }
    return variants
  })()

  // Состояние для динамических данных RadialBarChart
  const [radialData, setRadialData] = useState(radialDataVariants[0])
  // Состояние для индекса активного датасета
  const [activeRadialDatasetIndex, setActiveRadialDatasetIndex] = useState(0)

  // Данные для LineChart - динамика производства, финансы, транспорт, актеры
  // Реалистичные данные для небольшого продакшена (3 человека, ~10 проектов в год)
  const lineData = [
    { year: '2020', проекты: 8, бюджет: 42, доходы: 35, расходы: 48, инвестиции: 15, транспорт: 8, актеры: 'Актёр А' },
    { year: '2021', проекты: 12, бюджет: 58, доходы: 52, расходы: 62, инвестиции: 28, транспорт: 18, актеры: 'Актёр Б' },
    { year: '2022', проекты: 9, бюджет: 51, доходы: 44, расходы: 55, инвестиции: 22, транспорт: 12, актеры: 'Актёр В' },
    { year: '2023', проекты: 15, бюджет: 72, доходы: 68, расходы: 78, инвестиции: 38, транспорт: 28, актеры: 'Актёр Г' },
    { year: '2024', проекты: 11, бюджет: 63, доходы: 56, расходы: 68, инвестиции: 31, транспорт: 22, актеры: 'Актёр Д' },
    { year: '2025', проекты: 14, бюджет: 78, доходы: 72, расходы: 82, инвестиции: 42, транспорт: 32, актеры: 'Актёр Е' }
  ]

  // Начальное значение scale для анимации от 1.5 до 1
  const initialScale = useMotionValue(1.5)

  // Scroll-based анимация масштабирования от 1 до 0.5
  const { scrollYProgress } = useScroll({
    target: firstScreenRef,
    offset: ["start start", "end start"]
  })

  // Трансформируем scroll progress (0-1) в scale множитель (1 до 0.75), уменьшение в два раза медленнее
  // Вместо уменьшения от 1 до 0.5, уменьшаем от 1 до 0.75 (вдвое меньше уменьшение)
  const scrollScaleMultiplier = useTransform(scrollYProgress, [0, 1], [1, 0.75])
  
  // Комбинируем начальную анимацию и scroll-анимацию: умножаем initialScale на scrollScaleMultiplier
  const combinedScale = useTransform(
    [initialScale, scrollScaleMultiplier],
    ([initial, scroll]) => initial * scroll
  )

  // Смещение по оси Y: при скролле элементы уходят вверх
  // Используем фиксированное значение для избежания проблем с SSR
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -500])

  // Scroll для второго экрана - от появления снизу до полного отображения
  const { scrollYProgress: secondScreenScrollProgress } = useScroll({
    target: secondScreenRef,
    offset: ["start end", "start start"]
  })

  // Масштабирование div с рамкой: от 0.5 (когда нижняя грань экрана появляется) до 1 (когда по центру)
  const documentScale = useTransform(secondScreenScrollProgress, [0, 1], [0.5, 1])

  // Scroll для масштабирования договора при пересечении границы между экранами
  // Когда центр экрана (50%) пересекает границу между первым и вторым экраном
  const { scrollYProgress: boundaryScrollProgress } = useScroll({
    target: secondScreenRef,
    offset: ["start center", "start start"]
  })

  // Масштабирование договора: от 1 до 1.2 при пересечении границы
  const contractScale = useTransform(boundaryScrollProgress, [0, 1], [1, 1.2])

  // Анимация появления диаграмм при скролле
  // RadarChart появляется первой (0-0.3)
  const radarOpacity = useTransform(secondScreenScrollProgress, [0, 0.3], [0, 1])
  const radarScale = useTransform(secondScreenScrollProgress, [0, 0.3], [0.8, 1])
  
  // LineChart появляется последней (0.4-0.7)
  const lineOpacity = useTransform(secondScreenScrollProgress, [0.4, 0.7], [0, 1])
  const lineScale = useTransform(secondScreenScrollProgress, [0.4, 0.7], [0.9, 1])

  // Анимация изменения данных RadialBarChart при скролле (0-1, 10 вариантов)
  useMotionValueEvent(secondScreenScrollProgress, "change", (latest) => {
    // Преобразуем прогресс скролла (0-1) в индекс варианта (0-9)
    const variantIndex = Math.floor(latest * 10)
    const clampedIndex = Math.min(variantIndex, 9) // Ограничиваем максимум 9
    setRadialData(radialDataVariants[clampedIndex])
    setActiveRadialDatasetIndex(clampedIndex)
  })

  // Анимация изменения данных RadarChart при скролле (0-1, 15 вариантов)
  useMotionValueEvent(secondScreenScrollProgress, "change", (latest) => {
    // Преобразуем прогресс скролла (0-1) в индекс варианта (0-14)
    const variantIndex = Math.floor(latest * 15)
    const clampedIndex = Math.min(variantIndex, 14) // Ограничиваем максимум 14
    setRadarData(radarDataVariants[clampedIndex])
    setActiveRadarDatasetIndex(clampedIndex)
  })

  useEffect(() => {
    // Создаем сетку 40x40 с рандомными задержками для каждого квадратика
    // Заполненность зависит от строки: первая строка (верх) - все заполнены (1.0), последняя (низ) - все пустые (0.0)
    const gridSize = 40
    const cells = []
    for (let i = 0; i < gridSize; i++) {
      // Вычисляем вероятность заполнения для текущей строки: от 1.0 (первая строка) до 0.0 (последняя)
      const rowFillProbability = 1 - (i / (gridSize - 1))
      for (let j = 0; j < gridSize; j++) {
        // Случайно решаем, будет ли эта ячейка заполнена на основе вероятности для строки
        if (Math.random() < rowFillProbability) {
          // Генерируем рандомный цвет
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
          // Рандомная задержка от 1s до 5s (начинаем после завершения анимации линий)
          // Линии анимируются 1s, поэтому квадратики начинают появляться с 1s
          const delay = 1 + Math.random() * 4
          cells.push({
            id: `${i}-${j}`,
            color: randomColor,
            delay: delay,
            row: i,
            col: j
          })
        }
      }
    }
    setGrid(cells)

    // Анимация масштабирования: начинаем СРАЗУ при загрузке, длительность 5s, от scale(1.5) до scale(1)
    // Используем requestAnimationFrame для плавного старта
    requestAnimationFrame(() => {
      animate(initialScale, 1, {
        duration: 5,
        ease: "easeOut"
      })
    })
  }, [])

  return (
    <>
      {/* Первый экран - Сетка с анимацией */}
      <section 
        ref={firstScreenRef}
        style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
          position: 'relative'
        }}
      >
        <motion.div 
          style={{
            scale: combinedScale,
            y: translateY,
            transformOrigin: 'left top',
          position: 'relative',
          width: '2000px', // 40 * 50px
          height: '2000px',
          }}
        >
          {/* Черный прямоугольник для отрезания линий - повернут на 45 градусов */}
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2828px', // 2000 * sqrt(2) для перекрытия всей сетки при повороте на 45°
              height: '2828px',
              backgroundColor: '#000000',
              x: '-50%',
              y: '-50%',
              zIndex: 1,
              pointerEvents: 'none'
            }}
            initial={{ scale: 1, rotate: 45 }}
            animate={{ scale: 0, rotate: 45 }}
            transition={{ 
              delay: 1,
              duration: 1,
              ease: 'easeOut'
            }}
          />

          {/* Квадратики - под линиями */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(40, 50px)',
            gridTemplateRows: 'repeat(40, 50px)',
            gap: 0,
            zIndex: 2
          }}>
            {grid.map((cell) => (
              <motion.div
                key={cell.id}
                style={{
                  gridRow: cell.row + 1,
                  gridColumn: cell.col + 1,
                  width: '50px',
                  height: '50px',
                  backgroundColor: cell.color,
                  boxSizing: 'border-box',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ 
                  duration: 0.5,
                  ease: 'easeIn',
                  delay: cell.delay
                }}
              />
            ))}
          </div>

          {/* Горизонтальные линии - градиентная текстура */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '2000px',
              height: '2000px',
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 49px, #ffffff 49px, #ffffff 50px)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Вертикальные линии - градиентная текстура */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '2000px',
              height: '2000px',
              backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent 49px, #ffffff 49px, #ffffff 50px)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </motion.div>

        {/* Черный градиент от низа до середины первого экрана */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '50%',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      </section>

      {/* Второй экран - Договор с диаграммами */}
      <section 
        ref={secondScreenRef}
        style={{ 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {/* Диаграммы на заднем плане */}
        {/* RadarChart - top: 50%, left: 25% */}
        <motion.div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '25%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '300px',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: radarOpacity,
            scale: radarScale
          }}
        >
          {/* Номер активного датасета */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            fontSize: '14px',
            opacity: 0.8,
            fontFamily: 'monospace',
            zIndex: 10
          }}>
            Dataset: {activeRadarDatasetIndex + 1}/15
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#ffffff" strokeOpacity={0.12} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#ffffff', fontSize: 9, fillOpacity: 0.6 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 150]} 
                tick={{ fill: '#ffffff', fontSize: 8, fillOpacity: 0.4 }}
                axisLine={false}
              />
              <Radar 
                name="Показатели" 
                dataKey="A" 
                stroke="#ff0000" 
                fill="#ff0000" 
                fillOpacity={0.25}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* RadialBarChart - top: 65%, right: 30% */}
        <div 
          style={{
            position: 'absolute',
            top: '65%',
            right: '30%',
            transform: 'translate(50%, -50%)',
            width: '300px',
            height: '300px',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          {/* Номер активного датасета */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            fontSize: '14px',
            opacity: 0.8,
            fontFamily: 'monospace',
            zIndex: 10
          }}>
            Dataset: {activeRadialDatasetIndex + 1}/10
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="45%" 
              outerRadius="75%" 
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar 
                dataKey="value" 
                cornerRadius={3}
                fillOpacity={0.7}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* LineChart - 100% ширины, занимает весь второй экран */}
        <motion.div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: lineOpacity,
            scale: lineScale
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#ffffff" strokeOpacity={0.08} />
              <XAxis 
                dataKey="year" 
                stroke="#ffffff"
                strokeOpacity={0.8}
                tick={{ fill: '#ffffff', fontSize: 12, fillOpacity: 0.9 }}
                axisLine={{ stroke: '#ffffff', strokeOpacity: 0.4 }}
                height={50}
                dy={10}
              />
              <YAxis 
                stroke="#ffffff"
                strokeOpacity={0.5}
                tick={{ fill: '#ffffff', fontSize: 9, fillOpacity: 0.6 }}
                axisLine={false}
                domain={[5, 85]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '11px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', opacity: 0.7 }}
                iconType="line"
              />
              
              {/* Основные линии проектов и бюджета - плавные */}
              <Line 
                type="monotone" 
                dataKey="проекты" 
                stroke="#ff0000" 
                strokeWidth={2}
                strokeOpacity={0.9}
                dot={false}
                activeDot={{ r: 5, fill: '#ff0000' }}
                name="Проекты"
              />
              <Line 
                type="monotone" 
                dataKey="бюджет" 
                stroke="#ffffff" 
                strokeWidth={1.5}
                strokeOpacity={0.6}
                dot={false}
                activeDot={{ r: 4, fill: '#ffffff' }}
                name="Бюджет"
              />
              
              {/* Финансовые показатели - угловатые */}
              <Line 
                type="linear" 
                dataKey="доходы" 
                stroke="#00ff88" 
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: '#00ff88' }}
                name="Доходы"
              />
              <Line 
                type="linear" 
                dataKey="расходы" 
                stroke="#ff8800" 
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: '#ff8800' }}
                name="Расходы"
              />
              <Line 
                type="linear" 
                dataKey="инвестиции" 
                stroke="#88aaff" 
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#88aaff' }}
                name="Инвестиции"
              />
              
              {/* Транспортная активность - плавная */}
              <Line 
                type="monotone" 
                dataKey="транспорт" 
                stroke="#ff00ff" 
                strokeWidth={1.5}
                strokeOpacity={0.6}
                strokeDasharray="2 4"
                dot={false}
                activeDot={{ r: 4, fill: '#ff00ff' }}
                name="Транспорт"
              />
              
              {/* Метки актеров - вертикальные линии в точках времени */}
              {lineData.map((entry, index) => (
                <ReferenceLine 
                  key={`actor-${index}`}
                  x={entry.year} 
                  stroke="#ffff00" 
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  strokeDasharray="1 2"
                  label={{ 
                    value: entry.актеры, 
                    position: 'top', 
                    fill: '#ffff00', 
                    fontSize: 8, 
                    opacity: 0.7 
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Прозрачный контейнер договора с рамкой */}
        <motion.div
          style={{
            position: 'relative',
            width: 'calc((100vh - 4rem) * 0.707)',
            maxWidth: 'calc(100vw - 4rem)',
            height: 'calc(100vh - 4rem)',
            aspectRatio: '210 / 297',
            border: '1px solid #ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'transparent',
            scale: contractScale,
            transformOrigin: 'center center',
            zIndex: 2
          }}
        >
          {/* Надпись Договор */}
          <div style={{
            fontSize: '64px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '4rem',
            width: '100%',
            lineHeight: 1
          }}>
            <span style={{
              fontFamily: "'Izvod', sans-serif",
              color: '#ff0000',
              fontSize: '128px'
            }}>Д</span>
            <span style={{
              fontFamily: 'Helvetica, Arial, sans-serif'
            }}>оговор</span>
          </div>
        </motion.div>
      </section>

      {/* Третий экран - Проекты и Партнеры */}
      <section 
        ref={thirdScreenRef}
        style={{ 
        width: '100vw', 
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #000000 0%, #0a0e27 50%, #1a1f3a 100%)',
          position: 'relative',
          padding: '4rem 2rem',
          overflow: 'hidden'
        }}
      >
        {/* Мерцающие звезды */}
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: star.delay,
              ease: 'easeInOut'
            }}
          />
        ))}

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Раздел Проекты */}
          <div style={{ marginBottom: '6rem' }}>
            <h2 style={{
              fontSize: '48px',
              fontFamily: "'Slovic', sans-serif",
              color: '#ffffff',
              marginBottom: '3rem',
              textAlign: 'center'
            }}>
              Проекты
            </h2>
            
            {/* Горизонтальный слайдер */}
            <div style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              position: 'relative',
              paddingBottom: '1rem',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              <div style={{
                display: 'flex',
                gap: '2rem',
                width: 'max-content'
              }}>
                {movies.map((movie, index) => (
                  <motion.div
                    key={index}
                    style={{
                      minWidth: '300px',
                      height: '450px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: '#ffffff',
                      textAlign: 'center',
                      padding: '1rem',
                      flexShrink: 0
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    {movie}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Раздел Партнеры */}
          <div>
            <h2 style={{
              fontSize: '48px',
              fontFamily: "'Slovic', sans-serif",
              color: '#ffffff',
              marginBottom: '3rem',
              textAlign: 'center'
            }}>
              Партнеры
            </h2>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4rem',
              padding: '2rem'
            }}>
              {partners.map((partner, index) => (
                <motion.div
                  key={index}
                  style={{
                    width: '200px',
                    height: '120px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontFamily: "'Science Gothic', sans-serif"
                  }}
                  whileHover={{ scale: 1.1, borderColor: '#ffffff' }}
                  transition={{ duration: 0.2 }}
                >
                  {partner}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Надпись SI ПРОДАКШЕН */}
      <div style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#ffffff',
        fontFamily: "'Science Gothic', sans-serif",
        zIndex: 9999,
        pointerEvents: 'none',
        textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontFamily: "'Slovic', sans-serif",
          color: '#ff0000'
        }}>SI</span>
        <span>-PRODUCTION</span>
      </div>

      {/* Горизонтальная красная линия по середине экрана */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: 0,
        width: '100%',
        height: '2px',
        backgroundColor: '#ff0000',
        zIndex: 9998,
        pointerEvents: 'none',
        transform: 'translateY(-50%)'
      }} />
    </>
  )
}
