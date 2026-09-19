import { motion } from 'framer-motion';

const MOVES = [
  {
    n: '01',
    title: 'Identify',
    line: 'A photo is enough. The model names the material — plastic, paper, metal, glass, e-waste — in seconds.',
  },
  {
    n: '02',
    title: 'Locate',
    line: 'Your location and the material together decide which facilities can actually take it.',
  },
  {
    n: '03',
    title: 'Value',
    line: 'Where the data exists, an indicative payout is shown — waste priced like the resource it is.',
  },
  {
    n: '04',
    title: 'Discover',
    line: 'Ranked by distance, value and verification, the nearest route for the object appears on a real map.',
  },
];

/**
 * The narrative, introduced quietly: what SmartSort does, in four
 * moves. Monochrome by design — after the planet and the photographs,
 * restraint reads as confidence.
 */
export default function Narrative() {
  return (
    <section className="exp-narrative" aria-label="What SmartSort does">
      <motion.p
        className="exp-narrative__kicker font-mono"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        THIS IS SMARTSORT
      </motion.p>
      <motion.h2
        className="exp-narrative__title"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
      >
        An object photographed becomes an object understood.
      </motion.h2>
      <ol className="exp-narrative__list">
        {MOVES.map((m, i) => (
          <motion.li
            key={m.n}
            className="exp-narrative__item"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span className="exp-narrative__num font-mono">{m.n}</span>
            <h3 className="exp-narrative__move">{m.title}</h3>
            <p className="exp-narrative__line">{m.line}</p>
          </motion.li>
        ))}
      </ol>
      <motion.a
        className="exp-narrative__link font-mono"
        href="#/product"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        SEE IT WORKING <span aria-hidden>→</span>
      </motion.a>
    </section>
  );
}
