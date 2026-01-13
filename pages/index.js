import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent, useSpring, useTransform, useMotionValue, useMotionValueEvent as useMotionValueEvent2 } from 'framer-motion'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar } from 'recharts'

// Компонент пункта договора с галочкой
function ContractItem({ text, progress, threshold, textColor }) {
  // Галочка ставится когда progress >= threshold
  const isChecked = progress >= threshold

  return (
    <div style={{
          display: 'flex',
          alignItems: 'center',
      gap: '0.8em',
      fontSize: '1em',
      fontFamily: 'Helvetica, Arial, sans-serif',
      marginBottom: '0.8em'
    }}>
      <div style={{
          width: '1.2em',
          height: '1.2em',
          minWidth: '1.2em',
          minHeight: '1.2em',
          border: '0.1em solid #ff0000',
          borderRadius: '0.2em',
          flexShrink: 0,
          backgroundColor: isChecked ? '#ff0000' : 'transparent',
            display: 'flex',
            alignItems: 'center',
          justifyContent: 'center',
            position: 'relative',
          transition: 'background-color 0.3s ease'
        }}>
        {isChecked && (
          <svg
            width="0.8em"
            height="0.8em"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M3 8L6 11L13 4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        </div>
      {textColor ? (
        <motion.span style={{ color: textColor, fontWeight: 'bold' }}>{text}</motion.span>
      ) : (
        <span style={{ color: '#000000', fontWeight: 'bold' }}>{text}</span>
      )}
    </div>
  )
}

// Компонент Вспышка
function Flash({ isActive, onComplete }) {
  if (!isActive) return null

  // Несколько вспышек для калибровки (как на современных телефонах)
  // Финальная вспышка длится столько же, сколько хлопушка на экране (~2.6 сек)
  // Хлопушка появляется на 1/3 времени всех вспышек раньше (~1 сек)
  const totalDuration = 4.5 // Общая длительность: 0.5 сек калибровка + 2.6 сек финальная вспышка + 1.4 сек затухание
  const clapperboardShowTime = 1.0 // Хлопушка появляется на 1 сек (на 1/3 времени всех вспышек раньше)
  const finalFlashStart = 0.22 // Финальная вспышка начинается на 0.22 (~1 сек) - синхронизировано с хлопушкой
  const finalFlashPeak = 0.25 // Максимум финальной вспышки на 0.25 (~1.125 сек)
  const finalFlashEnd = 0.78 // Финальная вспышка заканчивается на 0.78 (~3.51 сек) - примерно когда хлопушка скрывается
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [
          0, 1, 0,      // Первая вспышка (быстрая)
          0, 0.8, 0,    // Вторая вспышка (средняя)
          0, 0.6, 0,    // Третья вспышка (слабая)
          0, 1, 1, 0    // Финальная длинная вспышка (длится столько же, сколько хлопушка на экране)
        ]
      }}
      transition={{ 
        duration: totalDuration,
        times: [
          0, 0.05, 0.1,           // Первая вспышка (0-0.45 сек)
          0.12, 0.15, 0.18,       // Вторая вспышка (0.54-0.81 сек)
          finalFlashStart, finalFlashPeak, finalFlashEnd, 1  // Финальная вспышка начинается раньше (~1 сек) и длится до ~3.51 сек
        ],
        onComplete: onComplete
      }}
        style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
          width: '100vw', 
          height: '100vh', 
        backgroundColor: '#ffffff',
        zIndex: 100000,
        pointerEvents: 'none'
      }}
    />
  )
}

// Компонент Хлопушка (Clapperboard) - теперь окно контактов
function Clapperboard({ isActive, isVisible, onClose }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragConstraints = { left: 0, right: 0, top: 0, bottom: 0 }
  
  // Вычисляем пропорциональную высоту на основе ширины 80vw
  const width = '80vw'
  const height = 'calc(80vw / 1.333)'
  
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event, info) => {
    // Закрытие окна при смахивании в любую сторону
    const threshold = Math.min(window.innerHeight, window.innerWidth) * 0.25 // 25% от меньшей стороны экрана
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2)
    
    if (distance > threshold) {
      if (onClose) {
        onClose()
      }
    }
    setIsDragging(false)
  }
  
  return (
        <motion.div
      initial={false}
      animate={{
        y: isVisible 
          ? ['-100vh', 0, -30, 0, -15, 0, -8, 0] // Падение сверху с отскоками
          : '-100vh',
        x: isVisible ? 0 : '100vw', // При показе x=0, при скрытии улетает вправо
        opacity: isVisible ? 1 : 0
      }}
      transition={{
        y: isVisible ? {
          duration: 1.5,
          times: [0, 0.4, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
          ease: [0.25, 0.46, 0.45, 0.94] // Ease out для падения
        } : {
          type: "spring",
          stiffness: 200,
          damping: 15,
          bounce: 0.6
        },
        x: {
          type: "spring",
          stiffness: 150,
          damping: 18,
          bounce: 0.4
        },
        opacity: {
          duration: 0.3
        }
      }}
      drag={true}
      dragConstraints={dragConstraints}
      dragElastic={0.3}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
          style={{
        position: 'relative',
        width: width,
        height: height,
        pointerEvents: 'auto',
        transformOrigin: 'top right',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Нижний блок - контакты с фейковыми данными */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#000000',
        border: '2px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(16px, 3vw, 32px)',
        fontSize: 'clamp(14px, 2.5vw, 24px)',
        fontFamily: "'Science Gothic', monospace",
        color: '#ffffff',
        zIndex: 1,
        gap: '1rem'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 'bold' }}>КОНТАКТЫ</div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '2px solid #ffffff',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              fontSize: 'clamp(12px, 2vw, 18px)',
              fontFamily: "'Science Gothic', monospace",
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#ffffff'
            }}
          >
            ЗАКРЫТЬ
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          flex: 1
        }}>
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Телеграм:</div>
            <a 
              href="https://t.me/example" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#00a8ff',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              @example_contact
            </a>
          </div>
          
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Email:</div>
            <div>contact@example.com</div>
          </div>
          
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Телефон:</div>
            <div>+7 (999) 123-45-67</div>
          </div>
        </div>
        </div>

      {/* Верхняя створка - черная с текстом SI-PRODUCTION */}
        <motion.div
        initial={false}
        animate={{ rotate: isActive ? 90 : 0 }}
        transition={{ 
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94] // Плавная анимация без spring эффекта
        }}
          style={{
            position: 'absolute',
            top: 0,
          right: 0,
            width: '100%',
          height: '50%',
          backgroundColor: '#000000',
          border: '2px solid #333',
          transformOrigin: 'bottom right',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
                  color: '#ffffff',
          fontSize: 'clamp(20px, 4vw, 48px)',
                  fontFamily: "'Science Gothic', monospace",
                        fontWeight: 'bold',
          zIndex: 2
        }}
      >
            <span style={{
          fontFamily: "'Slovic', sans-serif",
          color: '#ff0000'
        }}>SI</span>
        <span style={{
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
        }}>-PRODUCTION</span>
      </motion.div>
    </motion.div>
  )
}

// Компонент Галерея для активированной ленты (слайдер)
function Gallery({ frames, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isDragging, setIsDragging] = useState(false)
  const dragConstraints = { left: 0, right: 0, top: 0, bottom: 0 }
  
  // Обновляем индекс при изменении initialIndex
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  // Обработка клавиатуры для навигации
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0))
  }

  const handleVerticalDragStart = () => {
    setIsDragging(true)
  }

  const handleVerticalDragEnd = (event, info) => {
    // Вертикальный drag - закрытие слайдера
    const threshold = window.innerHeight * 0.25 // 25% от высоты экрана
    if (Math.abs(info.offset.y) > threshold) {
      onClose()
    }
    setIsDragging(false)
  }

  const handleHorizontalDragStart = () => {
    setIsDragging(true)
  }

  const handleHorizontalDragEnd = (event, info) => {
    // Горизонтальный drag - смена слайдов
    const threshold = 50 // Минимальное расстояние для смены слайда
    if (info.offset.x > threshold) {
      handlePrev()
    } else if (info.offset.x < -threshold) {
      handleNext()
    }
    setIsDragging(false)
  }

  return (
    <>
      {/* Overlay с затемнением */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 100000,
          cursor: 'pointer'
        }}
      />
      
      {/* Слайдер */}
      <motion.div
        onClick={(e) => e.stopPropagation()}
        drag="y"
        dragConstraints={dragConstraints}
        dragElastic={0.3}
        onDragStart={handleVerticalDragStart}
        onDragEnd={handleVerticalDragEnd}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100001,
          overflow: 'hidden'
        }}
      >
        {/* Контейнер слайдов */}
        <div
          style={{
            position: 'relative',
            width: '90vw',
            height: '90vh',
            maxWidth: '1400px',
            maxHeight: '900px'
          }}
        >
          {frames.map((color, index) => {
            const isActive = index === currentIndex
            return (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.8,
                  x: isActive ? 0 : (index < currentIndex ? -100 : 100)
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                drag="x"
                dragConstraints={dragConstraints}
                dragElastic={0.2}
                onDragStart={handleHorizontalDragStart}
                onDragEnd={handleHorizontalDragEnd}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: isActive ? 'auto' : 'none',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Кнопка "Назад" в левом верхнем углу */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            position: 'absolute',
            top: '32px',
            left: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '18px',
            fontFamily: "'Science Gothic', monospace",
            cursor: 'pointer',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <span style={{ fontSize: '24px' }}>←</span>
          <span>Назад</span>
        </button>

        {/* Кнопки навигации */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handlePrev()
          }}
          style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          ‹
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
          style={{
            position: 'absolute',
            right: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          ›
        </button>

        {/* Индикатор текущего слайда */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 100002
          }}
        >
          {frames.map((_, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(index)
              }}
              style={{
                width: index === currentIndex ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: index === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Счетчик слайдов */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            color: '#ffffff',
            fontSize: '18px',
            fontFamily: "'Science Gothic', monospace",
            zIndex: 100002,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {currentIndex + 1} / {frames.length}
        </div>
      </motion.div>
    </>
  )
}

function ProgressChart({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)

  // Отслеживаем изменения motion value и преобразуем в число
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)
    setProgress(progressPercent)
  })

  // Внешний круг - больше элементов, зависящих от скролла
  const outerData = [
    { name: 'P1', value: progress }, // 0-100%
    { name: 'P2', value: progress * 0.7 }, // 0-70%
    { name: 'P3', value: progress * 0.5 }, // 0-50%
    { name: 'P4', value: progress * 0.3 }, // 0-30%
    { name: 'A', value: 25 + progress * 0.2 }, // Двигается вверх
    { name: 'B', value: 30 - progress * 0.15 }, // Двигается вниз
    { name: 'C', value: 20 + progress * 0.4 }, // Двигается вверх
    { name: 'D', value: 35 - progress * 0.25 }, // Двигается вниз
    { name: 'E', value: 15 + progress * 0.35 }, // Двигается вверх
    { name: 'F', value: 40 - progress * 0.2 } // Двигается вниз
  ]

  // Внутренний круг - тоже с движущимися элементами
  const innerData = [
    { name: 'IP1', value: progress * 0.8 }, // 0-80%
    { name: 'IP2', value: progress * 0.6 }, // 0-60%
    { name: 'IP3', value: progress * 0.4 }, // 0-40%
    { name: 'IA', value: 20 + progress * 0.3 }, // Двигается вверх
    { name: 'IB', value: 25 - progress * 0.2 }, // Двигается вниз
    { name: 'IC', value: 15 + progress * 0.5 }, // Двигается вверх
    { name: 'ID', value: 30 - progress * 0.3 } // Двигается вниз
  ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PieChart width={600} height={600}>
        {/* Внешний круг */}
        <Pie
          data={outerData}
          cx="50%"
          cy="50%"
          innerRadius={120}
          outerRadius={200}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          isAnimationActive={false}
          stroke="#ffffff"
          strokeWidth={3}
          paddingAngle={2}
        >
          {outerData.map((entry, index) => (
            <Cell 
              key={`outer-cell-${index}`} 
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth={3}
            />
          ))}
        </Pie>
        {/* Внутренний круг */}
        <Pie
          data={innerData}
          cx="50%"
          cy="50%"
          innerRadius={20}
          outerRadius={110}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          isAnimationActive={false}
          stroke="#ffffff"
          strokeWidth={2}
          paddingAngle={1.5}
        >
          {innerData.map((entry, index) => (
            <Cell 
              key={`inner-cell-${index}`} 
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </Pie>
      </PieChart>
    </div>
  )
}

// Компонент линейной диаграммы с точками, зависящими от скролла
function LineChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)

  // Отслеживаем изменения motion value и преобразуем в число
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)
    setProgress(progressPercent)
  })

  // Создаем данные для диаграммы - точки двигаются вверх и вниз в зависимости от скролла
  const data = [
    { name: 'A', value: 20 + progress * 0.3, value2: 30 - progress * 0.2 }, // Первая линия вверх, вторая вниз
    { name: 'B', value: 50 - progress * 0.2, value2: 40 + progress * 0.3 }, // Первая вниз, вторая вверх
    { name: 'C', value: 30 + progress * 0.4, value2: 50 - progress * 0.25 }, // Первая вверх, вторая вниз
    { name: 'D', value: 60 - progress * 0.3, value2: 35 + progress * 0.4 }, // Первая вниз, вторая вверх
    { name: 'E', value: 40 + progress * 0.25, value2: 55 - progress * 0.15 }, // Первая вверх, вторая вниз
    { name: 'F', value: 70 - progress * 0.35, value2: 25 + progress * 0.5 }, // Первая вниз, вторая вверх
    { name: 'G', value: 25 + progress * 0.5, value2: 60 - progress * 0.3 }, // Первая вверх, вторая вниз
    { name: 'H', value: 55 - progress * 0.15, value2: 45 + progress * 0.2 }, // Первая вниз, вторая вверх
    { name: 'I', value: 35 + progress * 0.3, value2: 50 - progress * 0.35 }, // Первая вверх, вторая вниз
    { name: 'J', value: 65 - progress * 0.4, value2: 30 + progress * 0.45 }  // Первая вниз, вторая вверх
  ]

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
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="name" 
            stroke="#ffffff"
            tick={{ fill: '#ffffff' }}
            hide={true}
          />
          <YAxis 
            stroke="#ffffff"
            tick={{ fill: '#ffffff' }}
            domain={[0, 100]}
            hide={true}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff'
            }}
          />
          {/* Старая линия с точками */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#ffffff" 
            strokeWidth={3}
            dot={{ fill: '#ffffff', r: 6 }}
            activeDot={{ r: 8 }}
          />
          {/* Новая угловатая линия без точек */}
          <Line 
            type="step" 
            dataKey="value2" 
            stroke="#ffffff" 
            strokeWidth={2}
            dot={false}
            strokeOpacity={0.7}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Компонент радарной диаграммы
function RadarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)

  // Отслеживаем изменения motion value и преобразуем в число
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)
    setProgress(progressPercent)
  })

  const data = [
    { subject: 'A', value: 50 + progress * 0.3, fullMark: 100 },
    { subject: 'B', value: 60 - progress * 0.2, fullMark: 100 },
    { subject: 'C', value: 40 + progress * 0.4, fullMark: 100 },
    { subject: 'D', value: 70 - progress * 0.3, fullMark: 100 },
    { subject: 'E', value: 55 + progress * 0.25, fullMark: 100 },
    { subject: 'F', value: 45 - progress * 0.35, fullMark: 100 }
  ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#ffffff" strokeOpacity={0.3} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#ffffff', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: '#ffffff', fontSize: 10 }}
          />
          <Radar 
            name="Value" 
            dataKey="value" 
            stroke="#ffffff" 
            fill="#ffffff" 
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Компонент радиальной столбчатой диаграммы, зависимый от скролла
function RadialBarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)

  // Отслеживаем изменения motion value и преобразуем в число
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)
    setProgress(progressPercent)
  })

  const data = [
    { name: 'A', value: 20 + progress * 0.3, fill: '#ffffff' },
    { name: 'B', value: 40 - progress * 0.2, fill: '#ffffff' },
    { name: 'C', value: 60 + progress * 0.4, fill: '#ffffff' },
    { name: 'D', value: 30 - progress * 0.3, fill: '#ffffff' },
    { name: 'E', value: 50 + progress * 0.25, fill: '#ffffff' },
    { name: 'F', value: 70 - progress * 0.35, fill: '#ffffff' }
  ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="20%" 
          outerRadius="80%" 
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar 
            dataKey="value" 
            cornerRadius={4}
            fill="rgba(255, 255, 255, 0.3)"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Компонент карусели с постерами фильмов (вращающаяся карусель)
function MoviesCarousel({ movies }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const carouselRef = useRef(null)
  const autoPlayRef = useRef(null)

  // Автоматическое вращение карусели (но не скролл страницы)
  useEffect(() => {
    if (!isDragging) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
      }, 3000) // Меняем каждые 3 секунды
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [movies.length, isDragging])

  // Обработчики для перетаскивания
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.clientX)
    setDragOffset(0)
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const diff = e.clientX - startX
    setDragOffset(diff)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    const hadDrag = Math.abs(dragOffset) > 10
    setWasDragging(hadDrag)
    
    // Если перетащили достаточно далеко, меняем слайд
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
      } else {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => setWasDragging(false), 100)
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragOffset(0)
    }
  }

  // Вычисляем позиции для карусели (3D эффект)
  const getTransform = (index) => {
    const offset = index - currentIndex
    const absOffset = Math.abs(offset)
    const direction = offset > 0 ? 1 : -1
    
    // Если элемент далеко, скрываем его
    if (absOffset > 3) {
      return {
        transform: `translateX(${direction * 400}px) translateZ(-200px) scale(0.5)`,
        opacity: 0,
        zIndex: 0
      }
    }

    // Близкие элементы видны
    const scale = 1 - absOffset * 0.15
    const translateX = offset * 220 + (isDragging ? dragOffset : 0)
    const translateZ = -absOffset * 100
    const opacity = 1 - absOffset * 0.3

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`,
      opacity: Math.max(0, opacity),
      zIndex: movies.length - absOffset
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0',
      perspective: '1000px',
      perspectiveOrigin: 'center center'
    }}>
      <div 
        ref={carouselRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {movies.map((movie, index) => {
          const style = getTransform(index)
          
          const handleClick = (e) => {
            // Не открываем ссылку, если был drag
            if (wasDragging || isDragging) {
              e.preventDefault()
              return
            }
            if (movie.kinopoiskId) {
              window.open(`https://www.kinopoisk.ru/film/${movie.kinopoiskId}/`, '_blank')
            }
          }

          return (
            <motion.div
              key={index}
              style={{
                position: 'absolute',
                width: '200px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.6s ease',
                ...style
              }}
              onClick={handleClick}
            >
              <div style={{
                width: '100%',
                height: '300px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                backgroundColor: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                  onError={(e) => {
                    // При ошибке скрываем изображение и показываем название
                    e.target.style.display = 'none'
                    const parent = e.target.parentElement
                    if (!parent.querySelector('.fallback-text')) {
                      const fallback = document.createElement('div')
                      fallback.className = 'fallback-text'
                      fallback.style.cssText = 'color: #ffffff; font-family: "Slovic", sans-serif; font-size: 1.2rem; text-align: center; padding: 1rem; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%;'
                      fallback.textContent = movie.title
                      parent.appendChild(fallback)
                    }
                  }}
                />
              </div>
              <div style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                fontFamily: "'Slovic', sans-serif",
                textAlign: 'center',
                padding: '0.5rem',
                lineHeight: '1.3'
              }}>
                {movie.title}
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Индикаторы точек */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '2rem'
      }}>
        {movies.map((_, index) => (
          <div
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: index === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: index === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Компонент звездного неба с мерцающими звездами
// Компонент сетки с названиями партнеров
function PartnersGrid({ partners }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '2rem',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {partners.map((partner, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            minHeight: '150px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            color: '#ffffff',
            fontFamily: "'Slovic', sans-serif",
            fontSize: '1.5rem',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {partner.name}
          </div>
        </div>
      ))}
    </div>
  )
}

function StarrySky({ starCount = 100 }) {
  const [stars] = useState(() => {
    return Array.from({ length: starCount }, () => ({
      x: Math.random() * 100, // Позиция X в процентах
      y: Math.random() * 100, // Позиция Y в процентах
      size: Math.random() * 3 + 0.5, // Размер от 0.5px до 3.5px
      opacity: Math.random() * 0.8 + 0.2, // Прозрачность от 0.2 до 1
      twinkleSpeed: Math.random() * 3 + 1, // Скорость мерцания от 1 до 4 секунд
      twinkleDelay: Math.random() * 2 // Задержка начала анимации
    }))
  })

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1
    }}>
      {stars.map((star, index) => (
        <motion.div
          key={index}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity})`
          }}
          animate={{
            opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: star.twinkleSpeed,
            delay: star.twinkleDelay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

function KinoLenta({ frameCount, progress, center, topOffset = 0, speed = 1, angle = 0, inverse = false, scale = 1, onFrameClick, lentaId }) {
  // Генерируем случайные цвета для каждого кадра один раз при монтировании
  const [frames] = useState(() => {
    return Array.from({ length: frameCount }, () => {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      return `rgb(${r}, ${g}, ${b})`
    })
  })
  
  // Состояние для отслеживания hover на каждом кадре
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // progress - текущий прогресс скролла (0-1 или 0-100%)
  // center - значение прогресса, при котором лента должна быть в центре (0-1)
  // Нормализуем progress к диапазону 0-1, если передан в процентах
  const progressNormalized = progress > 1 ? progress / 100 : progress
  
  // Вычисляем целевую позицию ленты
  let targetLeftPosition = (progressNormalized - center) * 500 * speed
  if (inverse) {
    targetLeftPosition = -targetLeftPosition
  }
  
  // Создаем motion value для позиции
  const motionValue = useMotionValue(targetLeftPosition)
  
  // Обновляем motion value при изменении целевой позиции
  useEffect(() => {
    motionValue.set(targetLeftPosition)
  }, [targetLeftPosition, motionValue])
  
  // Используем useSpring для плавной анимации с spring эффектом
  const springPosition = useSpring(motionValue, {
    stiffness: 50,
    damping: 20,
    mass: 1
  })
  
  // Преобразуем spring значение в vw единицы для x transform
  const xPosition = useTransform(springPosition, (value) => `${value}vw`)

  return (
    // Внешний контейнер - позиционирование
          <div style={{
      position: 'fixed',
      top: `calc(50% + ${topOffset}vh)`,
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transformOrigin: 'center center',
      zIndex: 1000,
      pointerEvents: 'none' // Пропускаем события мыши для скролла
          }}>
      {/* Контейнер поворота - поворачивается на angle градусов */}
            <motion.div 
        style={{
        rotate: `${angle}deg`,
        transformOrigin: 'center center',
        pointerEvents: 'none'
      }}>
        {/* Контейнер движения - двигается по повернутой оси X */}
        <motion.div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none', // Пропускаем события мыши
            x: xPosition
          }}>
        {frames.map((color, index) => {
          const isHovered = hoveredIndex === index
          return (
            <div
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onFrameClick && onFrameClick(lentaId, index, frames)}
              style={{
                width: `${120 * scale}px`,
                height: `${80 * scale}px`,
                backgroundColor: color,
                borderRadius: '4px',
                flexShrink: 0,
                boxShadow: isHovered 
                  ? '0 8px 16px rgba(0, 0, 0, 0.4)' // Большая тень при hover
                  : '0 2px 4px rgba(0, 0, 0, 0.3)', // Маленькая тень по умолчанию
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                pointerEvents: 'auto' // Кадры остаются кликабельными
              }}
            />
          )
        })}
        </motion.div>
      </motion.div>
            </div>
  )
}

export default function Home() {
  const containerRef = useRef(null)
  const firstScreenRef = useRef(null)
  const secondScreenRef = useRef(null)
  const thirdScreenRef = useRef(null)
  
  const [progress, setProgress] = useState(0)
  const [firstScreenProgress, setFirstScreenProgress] = useState(0)
  const [secondScreenProgress, setSecondScreenProgress] = useState(0)
  const [thirdScreenProgress, setThirdScreenProgress] = useState(0)
  const [flashActive, setFlashActive] = useState(false)
  const [clapperboardActive, setClapperboardActive] = useState(true) // Изначально открыта
  const [clapperboardVisible, setClapperboardVisible] = useState(false) // Изначально скрыта
  
  // Состояние для активной галереи
  const [activeGallery, setActiveGallery] = useState(null) // { lentaId, frameIndex, frames }

  // 6 популярных российских кинопродакшенов/киностудий, принимающих госзаказы
  const partners = [
    { name: 'Мосфильм' },
    { name: 'Ленфильм' },
    { name: 'СТВ' },
    { name: 'Централ Партнершип' },
    { name: 'ВГТРК' },
    { name: 'Первый канал' }
  ]

  // Топ-20 популярных российских фильмов последних 5 лет (2019-2024) с правильными ID для Кинопоиска
  const topMovies = [
    { title: 'Т-34', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1900788/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Движение вверх', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Холоп', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Серебряные коньки', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Огонь', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Вторжение', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Лёд 2', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Союз спасения', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Стриптизёрши', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Время первых', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Экипаж', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Притяжение', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Лёд', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: '28 панфиловцев', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Душа', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Селфи', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Холоп 2', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Чебурашка', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Сердце Пармы', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Вызов', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 }
  ]
  
  const handleFrameClick = (lentaId, frameIndex, frames) => {
    setActiveGallery({ lentaId, frameIndex, frames })
  }
  
  const handleCloseGallery = () => {
    setActiveGallery(null)
  }
  
  const handleSign = () => {
    setFlashActive(true)
  }
  
  const handleFlashComplete = () => {
    setFlashActive(false)
  }
  
  // Показываем хлопушку на 1/3 времени всех вспышек раньше (~1 сек)
  // Без автозакрытия - окно остается открытым до ручного закрытия
  // Но верхняя створка закрывается после падения
  useEffect(() => {
    if (flashActive) {
      // Показываем на 1 сек (на 1/3 времени всех вспышек раньше)
      const showTimeout = setTimeout(() => {
        setClapperboardActive(true) // Открыта
        setClapperboardVisible(true) // Показываем и падает сверху
      }, 1000) // 1 сек - на 1/3 времени всех вспышек раньше
      
      // Закрываем верхнюю створку после падения (через ~1.5 сек после начала падения)
      // 1000ms (показ) + 1500ms (время падения) = 2500ms
      const closeFlapTimeout = setTimeout(() => {
        setClapperboardActive(false) // Закрываем верхнюю створку
      }, 2500)
      
      return () => {
        clearTimeout(showTimeout)
        clearTimeout(closeFlapTimeout)
      }
    }
    // Убираем else блок - окно остается видимым до ручного закрытия
  }, [flashActive])
  
  const handleClapperboardClose = () => {
    setClapperboardActive(false)
    setTimeout(() => {
      setClapperboardVisible(false)
    }, 600) // Время на анимацию закрытия
  }

  // Отслеживаем скролл контейнера с помощью framer-motion
  const { scrollYProgress, scrollY } = useScroll({
    container: containerRef,
    layoutEffect: false
  })

  // Отслеживаем прогресс каждого экрана от появления до исчезновения
  // offset: ["start end"] - когда верхний край экрана касается нижней части viewport (0%)
  // offset: ["end start"] - когда нижний край экрана касается верхней части viewport (100%)
  const { scrollYProgress: firstScreenScrollProgress } = useScroll({
    container: containerRef,
    target: firstScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  const { scrollYProgress: secondScreenScrollProgress } = useScroll({
    container: containerRef,
    target: secondScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  const { scrollYProgress: thirdScreenScrollProgress } = useScroll({
    container: containerRef,
    target: thirdScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  // Вычисляем прогресс: full = all page - 1 page
  // 0% когда scroll = 0
  // 100% когда scroll = full
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const viewportHeight = container.clientHeight // высота видимой области контейнера (1 page)
    const containerHeight = container.scrollHeight // общая высота контейнера (all page)
    const full = containerHeight - viewportHeight // all page - 1 page
    
    if (full <= 0) {
      setProgress(0)
      return
    }
    
    // Прогресс = (scroll / full) * 100
    const progressValue = (latest / full) * 100
    setProgress(Math.min(Math.max(Math.round(progressValue), 0), 100))
  })

  // Обновляем прогресс каждого экрана
  useMotionValueEvent(firstScreenScrollProgress, "change", (latest) => {
    setFirstScreenProgress(Math.min(Math.max(Math.round(latest * 100), 0), 100))
  })

  useMotionValueEvent(secondScreenScrollProgress, "change", (latest) => {
    setSecondScreenProgress(Math.min(Math.max(Math.round(latest * 100), 0), 100))
  })
  

  useMotionValueEvent(thirdScreenScrollProgress, "change", (latest) => {
    setThirdScreenProgress(Math.min(Math.max(Math.round(latest * 100), 0), 100))
  })

  return (
    <>
      {/* Компонент Вспышка */}
      <Flash isActive={flashActive} onComplete={handleFlashComplete} />
      
      {/* Галерея для активированной ленты */}
      {activeGallery && (
        <Gallery
          frames={activeGallery.frames}
          initialIndex={activeGallery.frameIndex}
          onClose={handleCloseGallery}
        />
      )}
      
      {/* Логотип SI-PRODUCTION в правом нижнем углу */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        color: '#ffffff',
        fontSize: 'clamp(32px, 6vw, 72px)',
        fontFamily: "'Science Gothic', monospace",
        fontWeight: 'bold',
        zIndex: 10000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{
          fontFamily: "'Slovic', sans-serif",
          color: '#ff0000'
        }}>SI</span>
        <span style={{
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
        }}>-PRODUCTION</span>
      </div>
      
      {/* Контейнер для хлопушки - fixed с overflow hidden */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 99999, // Ниже вспышки (100000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Clapperboard isActive={clapperboardActive} isVisible={clapperboardVisible} onClose={handleClapperboardClose} />
            </div>

      {/* Ленты размещены снаружи экранов с fixed позиционированием */}
      {/* Используем общий прогресс скролла (progress / 100), чтобы ленты могли двигаться непрерывно */}
      {/* center пересчитывается относительно первого экрана: делим на количество экранов (3) */}
      {/* Первая лента: когда Составление плана 60%, лента по центру экрана, размер вдвое */}
      <KinoLenta lentaId="lenta-1" frameCount={8} progress={progress / 100} center={0.6 * 0.6 / 3} topOffset={0} speed={1.0} angle={15} scale={2} onFrameClick={handleFrameClick} />
      
      {/* Вторая лента: inverse (справа налево), центр при 90%, topOffset 25vh, противоположный угол */}
      <KinoLenta lentaId="lenta-2" frameCount={8} progress={progress / 100} center={0.9 * 0.6 / 3} topOffset={25} speed={1.0} angle={-15} inverse={true} onFrameClick={handleFrameClick} />
      
      {/* Ленты сверху - распределены пониже */}
      <KinoLenta lentaId="lenta-3" frameCount={8} progress={progress / 100} center={0.3 * 0.6 / 3} topOffset={-45} speed={1.5} angle={20} scale={1.5} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-4" frameCount={8} progress={progress / 100} center={0.4 * 0.6 / 3} topOffset={-35} speed={1.2} angle={15} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-5" frameCount={8} progress={progress / 100} center={0.5 * 0.6 / 3} topOffset={-30} speed={0.7} angle={-25} inverse={true} scale={1.2} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-6" frameCount={8} progress={progress / 100} center={0.35 * 0.6 / 3} topOffset={-40} speed={1.3} angle={10} scale={1.8} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-7" frameCount={8} progress={progress / 100} center={0.65 * 0.6 / 3} topOffset={-25} speed={0.9} angle={-18} inverse={true} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-8" frameCount={8} progress={progress / 100} center={0.45 * 0.6 / 3} topOffset={-20} speed={1.1} angle={22} scale={1.3} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-9" frameCount={8} progress={progress / 100} center={0.55 * 0.6 / 3} topOffset={-15} speed={1.4} angle={-12} inverse={true} scale={1.6} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-10" frameCount={8} progress={progress / 100} center={0.7 * 0.6 / 3} topOffset={-10} speed={0.8} angle={-15} inverse={true} onFrameClick={handleFrameClick} />
      
      {/* Дополнительные ленты в центре */}
      <KinoLenta lentaId="lenta-11" frameCount={8} progress={progress / 100} center={0.75 * 0.6 / 3} topOffset={10} speed={1.2} angle={-12} inverse={true} scale={1.4} onFrameClick={handleFrameClick} />
      
      {/* Дополнительные ленты снизу - меньше лент */}
      <KinoLenta lentaId="lenta-12" frameCount={8} progress={progress / 100} center={0.8 * 0.6 / 3} topOffset={30} speed={0.8} angle={18} scale={1.6} onFrameClick={handleFrameClick} />
      <KinoLenta lentaId="lenta-13" frameCount={8} progress={progress / 100} center={0.85 * 0.6 / 3} topOffset={38} speed={1.1} angle={-20} inverse={true} onFrameClick={handleFrameClick} />
      
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Индикатор прогресса в левом верхнем углу */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        color: '#ffffff',
        fontSize: 'clamp(14px, 2vw, 18px)',
        fontFamily: "'Science Gothic', monospace",
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px 16px',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none'
      }}>
        Прогресс кинопроизводства: {progress}%
            </div>

      {/* Первый экран */}
      <section 
        ref={firstScreenRef}
        style={{ 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: '#000000',
          position: 'relative'
        }}
      >
        {/* Индикатор прогресса первого экрана */}
        <div style={{
          position: 'sticky',
          top: '16px',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: '16px',
          color: '#ffffff',
          fontSize: 'clamp(14px, 2vw, 18px)',
          fontFamily: "'Science Gothic', monospace",
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          Составление плана: {firstScreenProgress}%
            </div>

        {/* Надпись ПЕРВЫЙ ЭКРАН */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontFamily: "'Slovic', sans-serif",
          textAlign: 'center',
          zIndex: -1,
          pointerEvents: 'none'
        }}>
            Первый экран
            </div>
      </section>

      {/* Второй экран */}
      <section 
        ref={secondScreenRef}
        style={{ 
        width: '100vw', 
          height: '100vh', 
          backgroundColor: '#0a0a0a',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Индикатор прогресса второго экрана */}
        <div style={{
          position: 'sticky',
          top: '16px',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: '16px',
              color: '#ffffff',
          fontSize: 'clamp(14px, 2vw, 18px)',
          fontFamily: "'Science Gothic', monospace",
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          Запуск процессов: {secondScreenProgress}%
        </div>
        
        {/* Линейная диаграмма на весь экран */}
        <LineChartComponent progressMotionValue={secondScreenScrollProgress} />
        
        {/* Круговая диаграмма прогресса - по центру */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 15,
          width: '80vw',
          height: '80vw',
          maxWidth: '1000px',
          maxHeight: '1000px',
          pointerEvents: 'none'
        }}>
          <ProgressChart progressMotionValue={secondScreenScrollProgress} />
        </div>
        
        {/* Радарная диаграмма - сверху с отступом */}
        <div style={{
          position: 'absolute',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          width: '25vw',
          height: '25vw',
          maxWidth: '300px',
          maxHeight: '300px',
          pointerEvents: 'none'
        }}>
          <RadarChartComponent progressMotionValue={secondScreenScrollProgress} />
        </div>
        
        {/* Радиальная столбчатая диаграмма - снизу с отступом */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          width: '25vw',
          height: '25vw',
          maxWidth: '300px',
          maxHeight: '300px',
          pointerEvents: 'none'
        }}>
          <RadialBarChartComponent progressMotionValue={secondScreenScrollProgress} />
        </div>
        
          {/* Контейнер для договора */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(210mm, 90vw)',
            height: 'min(297mm, calc(90vw * 1.414))',
            maxHeight: '90vh',
            zIndex: 20
          }}>
            {/* Сетчатый лист A4 - фон с сеткой */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '1.5em 1.5em',
              backgroundPosition: 'center center',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.6)'
            }} />

            {/* Контейнер с текстом договора */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                padding: 'clamp(1rem, 3vw, 2rem)',
                display: 'flex',
                flexDirection: 'column',
                fontSize: 'clamp(24px, 3vw, 36px)',
                pointerEvents: 'auto',
                zIndex: 1
              }}
            >
            {/* Надпись ДОГОВОР сверху по центру */}
            <div style={{
              textAlign: 'center',
              marginBottom: 'auto',
              paddingTop: '1em'
            }}>
              <h1 
                style={{
                  fontSize: '2em',
                  fontFamily: "'Slovic', sans-serif",
                  color: '#ffffff',
                  margin: 0
                }}
              >
                ДОГОВОР
              </h1>
            </div>

            {/* Список услуг с галочками в центре */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingLeft: '2em',
              paddingRight: '2em'
            }}>
              <ContractItem text="Согласен с условиями" progress={secondScreenProgress} threshold={35} textColor="#ffffff" />
              <ContractItem text="Принимаю обязательства" progress={secondScreenProgress} threshold={40} textColor="#ffffff" />
              <ContractItem text="Подтверждаю ознакомление" progress={secondScreenProgress} threshold={50} textColor="#ffffff" />
              <ContractItem text="Готов к сотрудничеству" progress={secondScreenProgress} threshold={60} textColor="#ffffff" />
              <ContractItem text="Принимаю ответственность" progress={secondScreenProgress} threshold={65} textColor="#ffffff" />
            </div>

            {/* Кнопка Подписать снизу */}
            <div style={{
              textAlign: 'center',
              marginTop: 'auto',
              paddingBottom: '1em'
            }}>
              <button 
                onClick={handleSign}
                style={{
                  padding: '0.6em 1.6em',
                  backgroundColor: '#ff0000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.2em',
                  fontSize: '1em',
                  fontFamily: "'Slovic', sans-serif",
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                Подписать
              </button>
            </div>
          </div>
          </div>
        
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontFamily: "'Slovic', sans-serif",
          textAlign: 'center',
          zIndex: -1,
          pointerEvents: 'none'
        }}>
          Второй экран
        </div>
      </section>

      {/* Третий экран */}
      <section 
        ref={thirdScreenRef}
        style={{ 
        width: '100vw', 
          minHeight: '100vh', 
          background: 'linear-gradient(to bottom, #000000 0%, #0a0a2e 50%, #1a1a3e 100%)',
          position: 'relative',
          overflow: 'visible',
          paddingBottom: '4rem'
        }}
      >
        {/* Звездное небо */}
        <StarrySky starCount={150} />
        
        {/* Индикатор прогресса третьего экрана */}
        <div style={{
          position: 'sticky',
          top: '16px',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: '16px',
          color: '#ffffff',
          fontSize: 'clamp(14px, 2vw, 18px)',
          fontFamily: "'Science Gothic', monospace",
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          Монтаж: {thirdScreenProgress}%
        </div>

        {/* Секция ПРОЕКТЫ */}
        <div style={{
          width: '90%',
          margin: '0 auto',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          position: 'relative'
        }}>
          {/* Заголовок ПРОЕКТЫ */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1 
              style={{
                fontSize: 'clamp(2em, 5vw, 4em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0
              }}
            >
              ПРОЕКТЫ
            </h1>
          </div>

          {/* Карусель с фильмами */}
          <div style={{ minHeight: '500px' }}>
            <MoviesCarousel movies={topMovies} />
          </div>
        </div>

        {/* Секция ПАРТНЕРЫ */}
        <div style={{
          width: '90%',
          margin: '0 auto',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          position: 'relative'
        }}>
          {/* Заголовок ПАРТНЕРЫ */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1 
              style={{
                fontSize: 'clamp(2em, 5vw, 4em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0
              }}
            >
              ПАРТНЕРЫ
            </h1>
          </div>

          {/* Сетка с логотипами партнеров */}
          <PartnersGrid partners={partners} />
        </div>
      </section>
    </div>
    </>
  )
}
