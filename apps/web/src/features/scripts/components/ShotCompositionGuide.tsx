/** A neutral framing guide for unillustrated shots. It never claims to depict
 * the scene's actual people/products and works without an image provider. */
export function ShotCompositionGuide({ angle = "", size = "", visual = "" }: { angle?: string; size?: string; visual?: string }) {
  const words = `${angle} ${size} ${visual}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const overhead = /tren xuong|top.down|overhead/.test(words);
  const presenter = /guong mat|mim cuoi|nhin.*camera/.test(words);
  const detail = !presenter && /dac ta|can canh|close.up|b.roll/.test(words) && /san pham|hop|tay|do vat|product|box|hands/.test(words);
  return <svg viewBox="0 0 240 180" className="h-full w-full text-[#78816F]" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Sơ đồ bố cục tham khảo">
    <path d="M80 0V180M160 0V180M0 60H240M0 120H240" strokeDasharray="3 7" opacity="0.18" />
    {overhead ? <><rect x="42" y="28" width="156" height="124" rx="5" /><rect x="97" y="58" width="46" height="64" rx="3" /><path d="M48 164L70 115Q74 107 80 112L92 130M192 164L170 115Q166 107 160 112L148 130" /><path d="M112 75H129M112 87H129M112 99H122" /></>
      : detail ? <><path d="M25 145H215" /><rect x="84" y="44" width="72" height="101" rx="5" /><path d="M94 44V34H146V44M95 76H145M100 89H140" /><path d="M38 116L70 100M62 99L70 100L67 108" /></>
        : <><circle cx="120" cy="50" r="23" /><path d="M110 57Q120 64 130 57M77 153V109Q78 84 120 83Q162 84 163 109V153M90 108L70 126L45 108M150 108L173 123L191 94" /><path d="M175 82L193 65M184 65H193V74M100 153V176M140 153V176" /><path d="M22 158H218" opacity="0.5" /></>}
  </svg>;
}
