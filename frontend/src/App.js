import React, { useEffect, useState } from 'react'

function App() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    // Načtení konfigurace při startu
    fetch("/api")
      .then(res => res.json())
      .then(data => {
        console.log("Konfigurace:", data)
        setConfig(data)
      })
  }, [])

  useEffect(() => {
    // Pravidelné získávání statusu a případných měření
    const interval = setInterval(() => {
      fetch("/status")
        .then(res => res.json())
        .then(status => {
          if (status.newDataReady) {
            fetch("/measurements")
              .then(res => res.json())
              .then(data => {
                console.log("Nová měření:", data.measuredStorage)
              })
          }
        })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      {/* Žádné UI, výstup pouze do konzole */}
    </div>
  )
}

export default App
