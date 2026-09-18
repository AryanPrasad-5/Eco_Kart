/**
 * Static nav views (spec §18): "How it works" and "About / Future Vision".
 * Deliberately simple — no dashboards, no clutter. The future-vision page
 * frames the MVP (Identify → Locate → Value → Discover) as the foundation
 * of the long-term waste trading platform.
 */

export function HowItWorks() {
  return (
    <div className="static-page fade-in">
      <h2>How SmartSort works</h2>
      <p>
        SmartSort is a discovery bridge between the waste in your hands and the facilities
        that can actually do something with it:
      </p>
      <ul>
        <li><strong>Scan</strong> — take a photo of any waste item (or upload one).</li>
        <li><strong>Identify</strong> — SmartSort detects the material it&apos;s made of: plastic, paper, metal, glass, e-waste, organic, or other. You always get to confirm or correct the category.</li>
        <li><strong>Locate</strong> — with your permission, we use your browser location to find facilities near you. If you deny location access, you can use a labeled demo location instead.</li>
        <li><strong>Value</strong> — for materials with resale value, you see an indicative estimate in ₹/kg. Every estimate is clearly labeled — it is not an offer.</li>
        <li><strong>Discover</strong> — you get a ranked list (and map) of nearby facilities with distance, hours, contact, and directions.</li>
      </ul>
      <h2>Why confirm the category?</h2>
      <p>
        Waste is messy — items can be dirty, damaged, mixed, or ambiguous. The AI signal is a
        helpful first guess, not a verdict. You are always in control of the final category,
        and corrections go straight to facility matching without re-running the AI.
      </p>
    </div>
  );
}

export function About() {
  return (
    <div className="static-page fade-in">
      <h2>About SmartSort</h2>
      <p>
        People generate recyclable waste every day but often don&apos;t know what material it
        is, which nearby facility accepts it, or whether it has value. That gap sends
        recyclable material to landfills. SmartSort closes it:
      </p>
      <p className="future-vision">
        <strong>Waste → Identification → Location → Facility → Value</strong>
      </p>
      <h2>Future vision</h2>
      <p>
        Today SmartSort helps a person holding waste understand what it is, where they can
        take it, and what it may be worth. Tomorrow, the same foundations — the facility
        registry, the waste taxonomy, the ranking engine, and the valuation concept — evolve
        into a <strong>waste trading platform</strong>:
      </p>
      <ul>
        <li>Households and offices list or aggregate recyclable materials</li>
        <li>Recyclers and scrap buyers discover available materials and bid</li>
        <li>Verified market prices replace indicative estimates</li>
        <li>Logistics, routing, and payments complete the loop</li>
      </ul>
      <p>
        The MVP deliberately builds only <strong>Identify → Locate → Value → Discover</strong>.
        Login, payments, bidding, and marketplace features come later — nothing in the current
        product pretends otherwise.
      </p>
    </div>
  );
}
