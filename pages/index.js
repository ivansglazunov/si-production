import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const YandexMap = dynamic(() => import('../components/YandexMap'), {
  ssr: false
})

export default function Home() {
  const [grid, setGrid] = useState([])
  const [linesVisible, setLinesVisible] = useState(false)
  const [circles, setCircles] = useState([])
  const [scale, setScale] = useState(1.5)
  const [maskVisible, setMaskVisible] = useState(true)

  useEffect(() => {
    // Создаем сетку 150x150 с рандомными задержками для каждого квадратика
    const cells = []
    for (let i = 0; i < 150; i++) {
      for (let j = 0; j < 150; j++) {
        // Генерируем рандомный цвет
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
        // Рандомная задержка от 1s до 5s (начинаем после завершения анимации линий)
        // Линии анимируются 1s, поэтому квадратики начинают появляться с 1s
        const delay = 1 + Math.random() * 4
        cells.push({
          id: `${i}-${j}`,
          color: randomColor,
          delay: delay
        })
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
      setScale(1)
    })

    // Генерируем кружочки только на клиенте
    const circlesData = Array.from({ length: 15 }).map((_, i) => {
      const weight = Math.random()
      const size = 10 + (weight * 290) // 10px - 300px
      const isMoscow = Math.random() > 0.5
      const baseX = isMoscow ? 500 : 300
      const baseY = isMoscow ? 350 : 250
      const offsetX = (Math.random() - 0.5) * 200
      const offsetY = (Math.random() - 0.5) * 200
      
      return {
        id: i,
        size,
        baseX,
        baseY,
        offsetX,
        offsetY
      }
    })
    setCircles(circlesData)
  }, [])

  return (
    <>
      {/* Первый экран - Сетка с анимацией */}
      <section style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          transform: `scale(${scale})`,
          transition: 'transform 5s ease-out',
          transformOrigin: 'center center',
          position: 'relative',
          width: '7500px', // 150 * 50px
          height: '7500px',
        }}>
          {/* Черный прямоугольник для отрезания линий - повернут на 45 градусов */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '10607px', // 7500 * sqrt(2) для перекрытия всей сетки при повороте на 45°
              height: '10607px',
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
            gridTemplateColumns: 'repeat(150, 50px)',
            gridTemplateRows: 'repeat(150, 50px)',
            gap: 0,
            // zIndex: 2
          }}>
            {grid.map((cell) => (
              <div
                key={cell.id}
                className="square-fade-in"
                style={{
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
              width: '100%',
              height: '100%',
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 49px, #ffffff 49px, #ffffff 50px)',
              zIndex: 2,
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
              width: '100%',
              height: '100%',
              backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent 49px, #ffffff 49px, #ffffff 50px)',
              zIndex: 2,
              transform: linesVisible ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 1s ease-out',
              pointerEvents: 'none'
            }}
          />
        </div>
      </section>

      {/* Второй экран - Карта России */}
      <section style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%'
        }}>
          <YandexMap circles={circles} />
        </div>
      </section>

      {/* Третий экран - Пустой черный */}
      <section style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000'
      }} />

      {/* Четвертый экран - Пустой черный */}
      <section style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000'
      }} />
    </>
  )
}
