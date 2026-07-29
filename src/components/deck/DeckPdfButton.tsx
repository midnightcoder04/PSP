import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { DeckSlideView } from '@/components/deck/DeckSlideView'
import { loadPresentedDeck } from '@/lib/loadPresentedDeck'
import type { PresentedSlide, SessionCoverOverride } from '@/types/database'
import styles from './DeckPdfButton.module.css'

interface DeckPdfButtonProps {
  sessionId: string
}

/**
 * Downloads the session's deck as a PDF without entering presentation mode.
 *
 * No PDF library: the deck is already 16:9 CSS, so the reliable route is to
 * mount every slide in a print-only container and hand off to the browser's
 * own "Save as PDF" destination. One slide per landscape page. The deck is
 * fetched on click so the facilitator page pays nothing for a button that is
 * usually not pressed.
 */
export function DeckPdfButton({ sessionId }: DeckPdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [slides, setSlides] = useState<PresentedSlide[] | null>(null)
  const [coverOverride, setCoverOverride] = useState<SessionCoverOverride | null>(null)

  const download = useCallback(async () => {
    setLoading(true)
    try {
      const deck = await loadPresentedDeck(sessionId)
      setCoverOverride(deck.coverOverride)
      setSlides(deck.slides)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!slides) return
    // `@page` has to live in the document head. A rule in a body-level <style>
    // is honoured by Chrome but mishandled by WebKit and the macOS print path,
    // which then fits the landscape page box onto portrait paper by rotating
    // it 90° — the deck came out sideways. Injected per export rather than
    // living in the stylesheet so it can't hijack an ordinary Ctrl+P.
    const pageStyle = document.createElement('style')
    pageStyle.textContent = '@page { size: landscape; margin: 0; }'
    document.head.appendChild(pageStyle)
    // Marks this print run as a deck export, so the print stylesheet only takes
    // the page over here and not on an ordinary Ctrl+P of the session page.
    document.body.classList.add(styles.printing)
    // window.print() snapshots the document synchronously, so wait for React to
    // paint the print container before opening the dialog.
    const raf = requestAnimationFrame(() => window.print?.())
    const onAfterPrint = () => setSlides(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      cancelAnimationFrame(raf)
      pageStyle.remove()
      document.body.classList.remove(styles.printing)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [slides])

  return (
    <>
      <Button size="sm" variant="secondary" loading={loading} onClick={download}>
        Download PDF
      </Button>

      {slides
        ? createPortal(
            <div className={styles.printDeck} aria-hidden="true">
              {slides.map((slide) => (
                <div key={slide.id} className={styles.printSlide}>
                  {/* The team-collaboration slide renders as its static
                      placeholder; live participant data is not part of a
                      downloaded deck. */}
                  <DeckSlideView slide={slide} coverOverride={coverOverride} />
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  )
}
