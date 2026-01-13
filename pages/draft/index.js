import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate, useMotionValueEvent } from 'framer-motion'
import ReactECharts from 'echarts-for-react'

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

  // Состояние для галочек в договоре
  const [checkedItems, setCheckedItems] = useState([false, false, false, false, false])
  const [showSignButton, setShowSignButton] = useState(false)

  // Пункты для подписания
  const contractItems = [
    "Согласен с условиями",
    "Принимаю обязательства",
    "Подтверждаю ознакомление",
    "Готов к сотрудничеству",
    "Принимаю ответственность"
  ]
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

  // Временно отключена анимация первого экрана

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

  // Анимация изменения данных диаграмм при скролле
  useMotionValueEvent(secondScreenScrollProgress, "change", (latest) => {
    // Преобразуем прогресс скролла (0-1) в индексы вариантов
    const radialVariantIndex = Math.floor(latest * 10)
    const radarVariantIndex = Math.floor(latest * 15)

    const clampedRadialIndex = Math.min(radialVariantIndex, 9)
    const clampedRadarIndex = Math.min(radarVariantIndex, 14)

    // Обновляем данные диаграмм
    setRadialData(radialDataVariants[clampedRadialIndex])
    setActiveRadialDatasetIndex(clampedRadialIndex)

    setRadarData(radarDataVariants[clampedRadarIndex])
    setActiveRadarDatasetIndex(clampedRadarIndex)

    // Анимация галочек в договоре
    const checkedCount = Math.floor(latest * 5) + 1
    const newCheckedItems = checkedItems.map((_, index) => index < checkedCount)
    setCheckedItems(newCheckedItems)

    // Показываем кнопку ПОДПИСАТЬ когда все галочки отмечены
    setShowSignButton(latest >= 0.8)
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

  // Цвета для ленты (пока просто цвета вместо фотографий)
  const frames = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
  ]

  // Scroll для первого экрана - отслеживаем скролл от начала до конца первого экрана
  const { scrollYProgress: firstScreenScrollProgress } = useScroll({
    target: firstScreenRef,
    offset: ["start start", "end start"] // От начала первого экрана до его конца
  })

  // Преобразуем прогресс скролла в позицию x черной ленты
  // Когда скролл = 0 (начало): x = 0
  // Когда скролл = 0.5 (половина экрана проскроллена): x = 50vw
  // Когда скролл = 1 (конец экрана): x = 100vw
  // Используем стандартный подход framer-motion
  const blackStripX = useTransform(
    firstScreenScrollProgress,
    [0, 1],
    [0, typeof window !== 'undefined' ? window.innerWidth : 1920]
  )

  return (
    <>
      {/* Первый экран - Лента с фотографиями */}
      <section 
        ref={firstScreenRef}
        style={{ 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Временный отладочный элемент */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'white',
          zIndex: 10000,
          fontSize: '14px'
        }}>
          Progress: {firstScreenScrollProgress.get().toFixed(2)}
        </div>
        {/* Серый контейнер (не двигается) */}
        <div
          style={{
            width: '100%',
            height: '120px',
            backgroundColor: '#808080',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            padding: '10px'
          }}
        >
          {/* Черный двигающийся motion.div с кадрами */}
          <motion.div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5, // 50% прозрачность
              backgroundColor: '#000000',
              padding: '10px'
            }}
            x={blackStripX} // Позиция управляется скроллом
          >
            {frames.map((color, i) => (
              <div
                key={i}
                style={{
                  width: '120px',
                  height: '80px',
                  backgroundColor: color,
                  borderRadius: '4px',
                  flexShrink: 0
                }}
              />
            ))}
          </motion.div>
        </div>
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
          <ReactECharts
            key={`radar-${activeRadarDatasetIndex}`}
            option={{
              radar: {
                indicator: radarData.map(item => ({
                  name: item.subject,
                  max: 150
                })),
                splitLine: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.15)',
                    width: 1
                  }
                },
                splitArea: {
                  areaStyle: {
                    color: [
                      'rgba(255, 68, 68, 0.03)',
                      'rgba(255, 68, 68, 0.06)',
                      'rgba(255, 68, 68, 0.03)',
                      'rgba(255, 68, 68, 0.01)'
                    ]
                  }
                },
                axisLine: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 2
                  }
                },
                axisName: {
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 11,
                  fontWeight: 'bold',
                  fontFamily: "'Science Gothic', monospace"
                },
                nameGap: 15
              },
              series: [{
                name: 'Показатели',
                type: 'radar',
                data: [{
                  value: radarData.map(item => item.A),
                  name: 'Показатели',
                  itemStyle: {
                    color: {
                      type: 'conic',
                      x: 0.5,
                      y: 0.5,
                      colorStops: [
                        { offset: 0, color: '#ff0000' },
                        { offset: 0.3, color: '#ff4444' },
                        { offset: 0.7, color: '#ff6666' },
                        { offset: 1, color: '#ff8888' }
                      ]
                    },
                    shadowColor: '#ff0000',
                    shadowBlur: 15,
                    shadowOffsetX: 3,
                    shadowOffsetY: 3,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  },
                  areaStyle: {
                    color: {
                      type: 'radial',
                      x: 0.5,
                      y: 0.5,
                      r: 0.7,
                      colorStops: [
                        { offset: 0, color: 'rgba(255, 0, 0, 0.6)' },
                        { offset: 0.4, color: 'rgba(255, 0, 0, 0.3)' },
                        { offset: 0.8, color: 'rgba(255, 0, 0, 0.1)' },
                        { offset: 1, color: 'rgba(255, 0, 0, 0.02)' }
                      ]
                    },
                    opacity: 0.8
                  },
                  lineStyle: {
                    color: '#ff0000',
                    width: 3,
                    shadowColor: '#ff0000',
                    shadowBlur: 8,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                  },
                  emphasis: {
                    focus: 'self',
                    blurScope: 'coordinateSystem',
                    itemStyle: {
                      shadowColor: '#ff0000',
                      shadowBlur: 25,
                      shadowOffsetX: 5,
                      shadowOffsetY: 5,
                      borderWidth: 3
                    },
                    areaStyle: {
                      opacity: 0.9
                    }
                  }
                }],
                // Добавляем дополнительный слой для эффекта глубины
                symbol: 'circle',
                symbolSize: 8,
                showSymbol: true,
                emphasis: {
                  focus: 'self'
                }
              }],
              animationDuration: 2500,
              animationEasing: 'elasticOut',
              backgroundColor: 'transparent',
              // Добавляем эффект частиц
              graphic: {
                type: 'group',
                children: Array.from({ length: 20 }, (_, i) => ({
                  type: 'circle',
                  shape: { r: Math.random() * 2 + 1 },
                  style: {
                    fill: 'rgba(255, 0, 0, 0.3)',
                    shadowBlur: 10,
                    shadowColor: '#ff0000'
                  },
                  position: [
                    Math.random() * 400,
                    Math.random() * 300
                  ],
                  keyframeAnimation: {
                    duration: 3000 + Math.random() * 2000,
                    loop: true,
                    keyframes: [
                      { percent: 0, scale: 0, opacity: 0 },
                      { percent: 0.5, scale: 1, opacity: 0.8 },
                      { percent: 1, scale: 0, opacity: 0 }
                    ]
                  }
                }))
              }
            }}
            style={{ height: '100%', width: '100%' }}
          />
        </motion.div>

        {/* RadialBarChart - top: 65%, right: 30% */}
        <div
          style={{
            position: 'absolute',
            top: '65%',
            right: '30%',
            transform: 'translate(50%, -50%)',
            width: '350px',
            height: '350px',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          <ReactECharts
            key={`radial-${activeRadialDatasetIndex}`}
            option={{
              series: [
                {
                name: 'Показатели',
                type: 'pie',
                  radius: ['30%', '85%'],
                center: ['50%', '50%'],
                  startAngle: activeRadialDatasetIndex * 36, // Вращение диаграммы через изменение угла
                  endAngle: activeRadialDatasetIndex * 36 - 360,
                data: radialData.map((item, index) => ({
                  value: item.value,
                  name: item.name,
                  itemStyle: {
                    color: {
                        type: 'conic',
                        x: 0.5,
                        y: 0.5,
                        colorStops: [
                          { offset: 0, color: item.fill },
                          { offset: 0.5, color: item.fill + 'CC' },
                          { offset: 1, color: item.fill + '66' }
                        ]
                    },
                    shadowColor: item.fill,
                      shadowBlur: 12,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                      borderWidth: 3,
                    borderColor: '#ffffff',
                    borderType: 'solid'
                  }
                })),
                label: {
                  show: true,
                  position: 'outside',
                    formatter: '{b}\n{d}%',
                  color: '#ffffff',
                    fontSize: 11,
                  fontWeight: 'bold',
                    fontFamily: "'Science Gothic', monospace",
                  textShadowColor: '#000000',
                    textShadowBlur: 3,
                  textShadowOffsetX: 1,
                    textShadowOffsetY: 1,
                    lineHeight: 14
                },
                emphasis: {
                  label: {
                    show: true,
                      fontSize: 13,
                    fontWeight: 'bold'
                  },
                  itemStyle: {
                      shadowBlur: 20,
                      shadowOffsetX: 5,
                      shadowOffsetY: 5,
                      borderWidth: 4
                  }
                },
                itemStyle: {
                    borderRadius: 8
                },
                animationDelay: function (idx) {
                    return idx * 150;
                  }
                },
                // Добавляем внутренний круг для эффекта глубины
                {
                  name: 'Внутренний круг',
                  type: 'pie',
                  radius: '25%',
                  center: ['50%', '50%'],
                  data: [{ value: 1, itemStyle: { color: 'rgba(255, 255, 255, 0.1)' } }],
                  label: { show: false },
                  emphasis: { label: { show: false } },
                  animation: false
                }
              ],
              animationDuration: 800, // Уменьшаем время анимации для плавности
              animationEasing: 'cubicOut',
              backgroundColor: 'transparent',
              // Убираем graphic эффекты, которые могли создавать артефакты
              graphic: null
            }}
            style={{ height: '100%', width: '100%' }}
          />
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
          <ReactECharts
            key="line-chart"
            option={{
              title: {
                text: 'ДИНАМИКА ПРОИЗВОДСТВА SI PRODUCTION',
                left: 'center',
                top: '3%',
                textStyle: {
                  color: '#ffffff',
                  fontSize: 24,
                  fontWeight: 'bold',
                  fontFamily: "'Slovic', serif",
                  textShadowColor: '#000000',
                  textShadowBlur: 4,
                  textShadowOffsetX: 2,
                  textShadowOffsetY: 2
                }
              },
              grid: {
                left: '8%',
                right: '8%',
                top: '15%',
                bottom: '20%',
                containLabel: true,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
              },
              xAxis: {
                type: 'category',
                data: lineData.map(item => item.year),
                axisLine: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    width: 2,
                    shadowColor: '#ffffff',
                    shadowBlur: 5
                  }
                },
                axisTick: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    width: 2
                  }
                },
                axisLabel: {
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: "'Science Gothic', monospace",
                  textShadowColor: '#000000',
                  textShadowBlur: 2
                }
              },
              yAxis: {
                type: 'value',
                min: 0,
                max: 90,
                axisLine: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    width: 2
                  }
                },
                axisTick: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.4)'
                  }
                },
                axisLabel: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 11,
                  fontFamily: "'Science Gothic', monospace"
                },
                splitLine: {
                  lineStyle: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    type: 'dashed',
                    width: 1
                  }
                }
              },
              tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                textStyle: {
                  color: '#ffffff',
                  fontSize: 11
                },
                axisPointer: {
                  type: 'cross',
                  lineStyle: {
                    color: '#ffff00',
                    width: 1,
                    type: 'dashed'
                  }
                }
              },
              legend: {
                data: ['Проекты', 'Бюджет', 'Доходы', 'Расходы', 'Инвестиции', 'Транспорт'],
                textStyle: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 10
                },
                top: '5%'
              },
              series: [
                {
                  name: 'Проекты',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.проекты),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#ff0000' },
                        { offset: 1, color: '#ff4444' }
                      ]
                    },
                    width: 4,
                    opacity: 0.9,
                    shadowColor: '#ff0000',
                    shadowBlur: 10,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                  },
                  itemStyle: {
                    color: '#ff0000',
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    shadowColor: '#ff0000',
                    shadowBlur: 8
                  },
                  symbol: 'circle',
                  symbolSize: 8,
                  areaStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(255, 0, 0, 0.3)' },
                        { offset: 1, color: 'rgba(255, 0, 0, 0.05)' }
                      ]
                    }
                  },
                  emphasis: {
                    focus: 'series',
                    itemStyle: {
                      borderWidth: 4,
                      shadowBlur: 20,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3
                    }
                  },
                  animationDelay: 0
                },
                {
                  name: 'Бюджет',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.бюджет),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 0,
                      colorStops: [
                        { offset: 0, color: '#ffffff' },
                        { offset: 1, color: '#cccccc' }
                      ]
                    },
                    width: 3,
                    opacity: 0.7,
                    shadowColor: '#ffffff',
                    shadowBlur: 8
                  },
                  itemStyle: {
                    color: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#ff0000',
                    shadowColor: '#ffffff',
                    shadowBlur: 6
                  },
                  symbol: 'rect',
                  symbolSize: 7,
                  emphasis: {
                    focus: 'series',
                    itemStyle: {
                      shadowBlur: 12
                    }
                  },
                  animationDelay: 200
                },
                {
                  name: 'Доходы',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.доходы),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#00ff88' },
                        { offset: 1, color: '#00cc66' }
                      ]
                    },
                    width: 3,
                    opacity: 0.9,
                    shadowColor: '#00ff88',
                    shadowBlur: 8
                  },
                  itemStyle: {
                    color: '#00ff88',
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  },
                  symbol: 'triangle',
                  symbolSize: 7,
                  areaStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(0, 255, 136, 0.2)' },
                        { offset: 1, color: 'rgba(0, 255, 136, 0.05)' }
                      ]
                    }
                  },
                  emphasis: {
                    focus: 'series'
                  },
                  animationDelay: 400
                },
                {
                  name: 'Расходы',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.расходы),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 0,
                      colorStops: [
                        { offset: 0, color: '#ff8800' },
                        { offset: 1, color: '#ffaa22' }
                      ]
                    },
                    width: 3,
                    opacity: 0.8,
                    shadowColor: '#ff8800',
                    shadowBlur: 8
                  },
                  itemStyle: {
                    color: '#ff8800',
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  },
                  symbol: 'diamond',
                  symbolSize: 7,
                  emphasis: {
                    focus: 'series'
                  },
                  animationDelay: 600
                },
                {
                  name: 'Инвестиции',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.инвестиции),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#88aaff' },
                        { offset: 1, color: '#6688ff' }
                      ]
                    },
                    width: 3,
                    opacity: 0.8,
                    shadowColor: '#88aaff',
                    shadowBlur: 8
                  },
                  itemStyle: {
                    color: '#88aaff',
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  },
                  symbol: 'pin',
                  symbolSize: 7,
                  emphasis: {
                    focus: 'series'
                  },
                  animationDelay: 800
                },
                {
                  name: 'Транспорт',
                  type: 'line',
                  smooth: true,
                  data: lineData.map(item => item.транспорт),
                  lineStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#ff00ff' },
                        { offset: 1, color: '#ff44ff' }
                      ]
                    },
                    width: 3,
                    opacity: 0.8,
                    shadowColor: '#ff00ff',
                    shadowBlur: 8
                  },
                  itemStyle: {
                    color: '#ff00ff',
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  },
                  symbol: 'arrow',
                  symbolSize: 7,
                  emphasis: {
                    focus: 'series'
                  },
                  animationDelay: 1000
                }
              ].concat(
                // Добавляем метки актеров как вертикальные линии
                lineData.map((entry, index) => ({
                  name: `Актер ${index + 1}`,
                  type: 'line',
                  data: lineData.map(() => null), // Пустые данные
                  markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: {
                      color: '#ffff00',
                      width: 1,
                      type: 'dashed',
                      opacity: 0.4
                    },
                    data: [{
                      xAxis: entry.year,
                      label: {
                        show: true,
                        position: 'top',
                        formatter: entry.актеры,
                        color: '#ffff00',
                        fontSize: 8,
                        fontWeight: 'bold',
                        textShadowColor: '#000000',
                        textShadowBlur: 2
                      }
                    }]
                  }
                }))
              ),
              animationDuration: 3000,
              animationEasing: 'elasticOut',
              backgroundColor: 'transparent',
              // Добавляем эффекты частиц для большей интерактивности
              graphic: {
                type: 'group',
                children: Array.from({ length: 15 }, (_, i) => ({
                  type: 'circle',
                  shape: { r: Math.random() * 3 + 2 },
                  style: {
                    fill: 'rgba(255, 255, 255, 0.2)',
                    shadowBlur: 8,
                    shadowColor: '#ffffff'
                  },
                  position: [
                    Math.random() * 100 + '%',
                    Math.random() * 100 + '%'
                  ],
                  keyframeAnimation: {
                    duration: 4000 + Math.random() * 3000,
                    loop: true,
                    keyframes: [
                      { percent: 0, opacity: 0, scale: 0 },
                      { percent: 0.3, opacity: 0.6, scale: 1 },
                      { percent: 0.7, opacity: 0.6, scale: 1 },
                      { percent: 1, opacity: 0, scale: 0 }
                    ]
                  }
                }))
              }
            }}
            style={{ height: '100%', width: '100%' }}
          />
        </motion.div>

        {/* Прозрачный контейнер договора с рамкой */}
        <motion.div
          style={{
            position: 'relative',
            width: 'calc((100vh - 4rem) * 0.707)',
            maxWidth: 'calc(100vw - 4rem)',
            height: 'calc(100vh - 4rem)',
            aspectRatio: '210 / 297',
            border: '2px solid #ffffff',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'transparent',
            scale: contractScale,
            transformOrigin: 'center center',
            zIndex: 2,
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(0px)',
            WebkitBackdropFilter: 'blur(0px)'
          }}
        >
          {/* Надпись Договор */}
          <div style={{
            fontSize: '64px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '2rem',
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

          {/* Содержимое договора */}
          <div style={{
            padding: '1rem 2rem 2rem 2rem',
            fontSize: '11px',
            color: '#ffffff',
            lineHeight: 1.3,
            fontFamily: 'Helvetica, Arial, sans-serif',
            opacity: 0.8,
            pointerEvents: 'none'
          }}>
            {/* Интерактивные пункты для подписания (поверх размытого текста) */}
            <div style={{
              position: 'absolute',
              bottom: '120px',
              left: '2rem',
              right: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              filter: 'none',
              WebkitFilter: 'none',
              pointerEvents: 'auto'
            }}>
              {contractItems.map((item, index) => (
                <motion.div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#ffffff'
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: checkedItems[index] ? 1 : 0.3,
                    x: checkedItems[index] ? 0 : -20
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ff0000',
                      borderRadius: '2px',
                      backgroundColor: checkedItems[index] ? '#ff0000' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    animate={{
                      backgroundColor: checkedItems[index] ? '#ff0000' : 'transparent',
                      boxShadow: checkedItems[index] ? '0 0 10px rgba(255, 0, 0, 0.5)' : 'none'
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {checkedItems[index] && (
                      <motion.svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <motion.path
                          d="M20 6L9 17L4 12"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        />
                      </motion.svg>
                    )}
                  </motion.div>
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>

            {/* Кнопка ПОДПИСАТЬ (поверх размытого текста) */}
            <motion.button
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                padding: '8px 16px',
                backgroundColor: '#ff0000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: "'Science Gothic', monospace",
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                filter: 'none',
                WebkitFilter: 'none',
                pointerEvents: 'auto'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: showSignButton ? 1 : 0,
                scale: showSignButton ? 1 : 0.8
              }}
              transition={{ duration: 0.5 }}
              whileHover={{
                scale: 1.05,
                backgroundColor: '#cc0000',
                boxShadow: '0 0 15px rgba(255, 0, 0, 0.6)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Анимация подписания
                setCheckedItems([true, true, true, true, true])
              }}
            >
              ПОДПИСАТЬ
            </motion.button>
            <div style={{ marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
              ДОГОВОР № 001/2025<br/>
              на оказание услуг кинопроизводства
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>г. Москва</strong> «01» января 2025 г.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>Заказчик:</strong> Федеральное агентство по культуре и кинематографии<br/>
              Адрес: 125993, г. Москва, Малый Гнездниковский пер., д. 7/6<br/>
              <strong>Исполнитель:</strong> ООО "SI PRODUCTION"<br/>
              ИНН 771234567890, ОГРН 1027700123456<br/>
              Адрес: 127018, г. Москва, ул. Сущевский вал, д. 5, стр. 1<br/>
              именуемые совместно "Стороны", а по отдельности "Заказчик" и "Исполнитель",
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              1. ПРЕДМЕТ ДОГОВОРА
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              1.1. Исполнитель обязуется оказать Заказчику комплекс услуг по производству полнометражного
              художественного фильма "Тени прошлого" (далее - "Проект") в соответствии с техническим заданием,
              календарным планом производства и требованиями Федерального закона № 126-ФЗ "О связи".
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              1.2. Исполнитель подтверждает наличие опыта кинопроизводства более 16 лет, включая работу
              с субподрядными организациями, государственным финансированием и соблюдением требований
              Федерального закона № 44-ФЗ "О контрактной системе".
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              1.3. Проект включает полный цикл кинопроизводства: подготовительный период, съемочный период,
              постпродакшн, техническую и художественную доводку, изготовление копий и сдачу готового фильма.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              2. ОБЯЗАННОСТИ И ПРАВА СТОРОН
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              2.1. Исполнитель обязуется:<br/>
              • Обеспечить полный цикл кинопроизводства в соответствии с ГОСТ Р 52872-2012<br/>
              • Привлечь квалифицированных специалистов с опытом работы не менее 5 лет<br/>
              • Обеспечить соблюдение требований Трудового кодекса РФ при найме персонала<br/>
              • Предоставить ежемесячную отчетность о расходовании бюджетных средств<br/>
              • Гарантировать соответствие фильма возрастной категории 16+<br/>
              • Обеспечить получение прокатного удостоверения в соответствии с ФЗ № 126-ФЗ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              2.2. Заказчик обязуется:<br/>
              • Перечислять авансовые платежи в соответствии с графиком финансирования<br/>
              • Предоставить утвержденный сценарий и техническое задание в течение 10 дней<br/>
              • Одобрять этапы работы в сроки, предусмотренные календарным планом<br/>
              • Предоставить доступ к объектам для съемок в соответствии с законодательством РФ<br/>
              • Своевременно согласовывать изменения в бюджете и графике производства
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              3. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              3.1. Общая стоимость услуг составляет 125 000 000 (сто двадцать пять миллионов)
              рублей 00 копеек, в том числе НДС 20% - 20 833 333 рубля 33 копейки.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              3.2. Оплата производится поэтапно согласно Постановлению Правительства РФ № 1496:<br/>
              • Аванс 30% (37 500 000 руб.) - в течение 10 банковских дней после подписания<br/>
              • 25% (31 250 000 руб.) - после завершения подготовительного периода<br/>
              • 25% (31 250 000 руб.) - после окончания съемочного периода<br/>
              • 20% (25 000 000 руб.) - после сдачи готового фильма и получения прокатного удостоверения
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              3.3. Все платежи осуществляются путем безналичного перечисления на расчетный счет Исполнителя
              с указанием в платежном поручении номера и даты настоящего договора.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              4. СРОКИ ИСПОЛНЕНИЯ ОБЯЗАТЕЛЬСТВ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              4.1. Общий срок исполнения обязательств: с 01.02.2025 по 31.12.2025<br/>
              4.2. Ключевые этапы производства:<br/>
              • Подготовительный период: 01.02.2025 - 31.03.2025<br/>
              • Съемочный период: 01.04.2025 - 30.09.2025<br/>
              • Постпродакшн: 01.10.2025 - 30.11.2025<br/>
              • Техническая доводка и сдача: 01.12.2025 - 31.12.2025
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              4.3. Исполнитель несет ответственность за соблюдение сроков в соответствии с
              Гражданским кодексом РФ и несет штрафные санкции в размере 0,1% от стоимости
              невыполненных работ за каждый день просрочки.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              5. КАЧЕСТВО УСЛУГ И ПРИЕМКА РАБОТ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              5.1. Качество оказываемых услуг должно соответствовать требованиям технического задания,
              ГОСТ Р 52872-2012 и требованиям к кинематографической продукции.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              5.2. Приемка выполненных работ осуществляется поэтапно согласно акту приемки-передачи.
              Заказчик вправе требовать устранения недостатков в 10-дневный срок.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              5.3. Готовый фильм должен получить прокатное удостоверение и соответствовать
              требованиям Федерального закона № 126-ФЗ "О связи".
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              6. ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              6.1. Исключительные права на фильм принадлежат Заказчику в соответствии с
              Гражданским кодексом РФ (часть 4) и Федеральным законом № 149-ФЗ.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              6.2. Исполнитель гарантирует отсутствие обременений на результаты интеллектуальной деятельности
              и несет ответственность за нарушение авторских прав третьих лиц.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              7. КОНФИДЕНЦИАЛЬНОСТЬ И ЗАЩИТА ПЕРСОНАЛЬНЫХ ДАННЫХ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              7.1. Стороны обязуются соблюдать конфиденциальность информации в соответствии с
              Федеральным законом № 152-ФЗ "О персональных данных" и № 149-ФЗ "Об информации".
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              7.2. Исполнитель обеспечивает защиту персональных данных участников проекта
              и получает необходимые согласия на обработку персональных данных.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              8. ОТВЕТСТВЕННОСТЬ СТОРОН
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              8.1. За неисполнение или ненадлежащее исполнение обязательств Стороны несут
              ответственность в соответствии с действующим законодательством РФ.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              8.2. В случае просрочки платежей Заказчик уплачивает пеню в размере 1/300 ставки
              рефинансирования ЦБ РФ от неуплаченной суммы за каждый день просрочки.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              8.3. Максимальный размер ответственности Исполнителя ограничен стоимостью невыполненных работ.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              9. ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              9.1. Стороны освобождаются от ответственности при наступлении форс-мажорных обстоятельств:
              стихийные бедствия, эпидемии, военные действия, забастовки, нормативные акты органов власти.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              9.2. Сторона, подвергшаяся форс-мажору, обязана незамедлительно уведомить другую Сторону
              и предоставить документы, подтверждающие наступление форс-мажора.
            </div>

            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              10. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              10.1. Все споры разрешаются в Арбитражном суде г. Москвы в соответствии с законодательством РФ.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              10.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу. Один экземпляр
              хранится у Заказчика, второй - у Исполнителя.
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'justify' }}>
              10.3. Все изменения и дополнения к настоящему договору оформляются в письменной форме.
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>Заказчик:</strong><br/>
                Федеральное агентство по культуре<br/>
                и кинематографии<br/>
                _________________________<br/>
                И.И. Иванов<br/>
                (подпись)
              </div>
              <div>
                <strong>Исполнитель:</strong><br/>
                ООО "SI PRODUCTION"<br/>
                _________________________<br/>
                П.П. Петров<br/>
                (подпись)
              </div>
            </div>
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
