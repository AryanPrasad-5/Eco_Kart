import { motion } from 'framer-motion';
import { WHALE_PHOTO, TURTLE_PHOTO, KINGFISHER_PHOTO, type PhotoCredit } from '../assets/credits';

interface Chapter {
  id: string;
  kicker: string;
  title: string;
  body: string;
  photo: PhotoCredit;
  /** Which side the photo sits on for desktop split layout. */
  side: 'left' | 'right';
}

const CHAPTERS: Chapter[] = [
  {
    id: 'life',
    kicker: 'THE OCEAN',
    title: 'Three hundred million tonnes. Every year.',
    body: 'That is how much plastic enters the water. A humpback surfaces in water that carries what we throw away — and what we could have returned to use.',
    photo: WHALE_PHOTO,
    side: 'left',
  },
  {
    id: 'reef',
    kicker: 'THE REEF',
    title: 'A turtle cannot sort its own ocean.',
    body: 'Reefs feed a quarter of marine life. Float a bottle through these waters and it outlives the turtle that mistakes it. Sorting happens upstream, on land — by us.',
    photo: TURTLE_PHOTO,
    side: 'right',
  },
  {
    id: 'forest',
    kicker: 'THE FOREST',
    title: 'The kingfisher keeps its own ledger.',
    body: 'A clean river, a live ditch, a working shoreline — birds are the auditors of an ecosystem. When materials cycle instead of piling up, the audit passes.',
    photo: KINGFISHER_PHOTO,
    side: 'left',
  },
];

/**
 * Three chapters of real photography — the life the system exists to
 * keep. Photos are local, lazy-loaded, and credited on-screen.
 */
export default function Chapters() {
  return (
    <div className="exp-chapters">
      {CHAPTERS.map((c) => (
        <section key={c.id} id={c.id} className="exp-chapter" aria-label={c.kicker}>
          <figure className={`exp-chapter__media exp-chapter__media--${c.side}`}>
            <div className="exp-chapter__frame">
              <img
                src={c.photo.src}
                alt={c.photo.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
            <figcaption className="exp-chapter__credit font-mono">
              <a href={c.photo.sourceUrl} target="_blank" rel="noreferrer">
                {c.photo.credit}
              </a>
            </figcaption>
          </figure>
          <motion.div
            className="exp-chapter__text"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-18% 0px' }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <p className="exp-chapter__kicker font-mono">{c.kicker}</p>
            <h2 className="exp-chapter__title">{c.title}</h2>
            <p className="exp-chapter__body">{c.body}</p>
          </motion.div>
        </section>
      ))}
    </div>
  );
}
