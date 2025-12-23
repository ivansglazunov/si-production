import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate } from 'framer-motion'

export default function Home() {
  const [grid, setGrid] = useState([])
  const [linesVisible, setLinesVisible] = useState(false)
  const [maskVisible, setMaskVisible] = useState(true)
  const firstScreenRef = useRef(null)
  const secondScreenRef = useRef(null)

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

    // Анимация линий - начинаем СРАЗУ при загрузке страницы
    setLinesVisible(true)

    // Анимация маски - улетает после того как линии пересеклись (примерно через 1s)
    setTimeout(() => {
      setMaskVisible(false)
    }, 1000)

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
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2828px', // 2000 * sqrt(2) для перекрытия всей сетки при повороте на 45°
              height: '2828px',
              backgroundColor: '#000000',
              transformOrigin: 'center center',
              transform: maskVisible 
                ? 'translate(-50%, -50%) rotate(45deg) scale(1)' 
                : 'translate(-50%, -50%) rotate(45deg) scale(0)',
              transition: 'transform 1s ease-out',
              zIndex: 1,
              pointerEvents: 'none'
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
              <div
                key={cell.id}
                className="square-fade-in"
                style={{
                  gridRow: cell.row + 1,
                  gridColumn: cell.col + 1,
                  width: '50px',
                  height: '50px',
                  backgroundColor: cell.color,
                  boxSizing: 'border-box',
                  animationDelay: `${cell.delay}s`
                }}
              />
            ))}
          </div>

          {/* Горизонтальные линии - градиентная текстура */}
          <div
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
              transform: linesVisible ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 1s ease-out',
              pointerEvents: 'none'
            }}
          />

          {/* Вертикальные линии - градиентная текстура */}
          <div
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
              transform: linesVisible ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 1s ease-out',
              pointerEvents: 'none'
            }}
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

      {/* Второй экран - Пустой черный */}
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
        <div
          style={{
            // A4 пропорции: 210mm / 297mm = 0.707 (ширина/высота)
            // Вписываем по высоте (большая сторона A4), с небольшим отступом
            height: 'calc(100vh - 4rem)',
            width: 'calc((100vh - 4rem) * 0.707)',
            maxWidth: 'calc(100vw - 4rem)',
            aspectRatio: '210 / 297',
            border: '1px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000'
          }}
        >
          {/* Контент документа */}
        </div>
      </section>

      {/* Третий экран - Пустой черный */}
      <section style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000'
      }} />

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
        textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.9)'
      }}>
        SI-PRODUCTION
      </div>
    </>
  )
}
