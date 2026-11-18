"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "hi" | "te";

export const T = {
  en: { callWaiter: "Call waiter", bill: "Request bill", vegOnly: "Veg only", add: "Add", soldOut: "Sold out",
    confirm: "Confirm order", placing: "Placing order...", readyIn: "ready in about", min: "min", items: "items",
    table: "Table", pairs: "Goes well with", off: "off", rateTitle: "How was your meal?", submit: "Submit",
    thanks: "Thank you!", received: "Order received", preparing: "Being prepared", ready: "Ready to serve",
    served: "Served", loading: "Loading...", enjoy: "Enjoy your order.", est: "Estimated ready in about", total: "Total" },
  hi: { callWaiter: "वेटर को बुलाएं", bill: "बिल मंगाएं", vegOnly: "केवल शाकाहारी", add: "जोड़ें", soldOut: "खत्म",
    confirm: "ऑर्डर पक्का करें", placing: "ऑर्डर हो रहा है...", readyIn: "तैयार होने में लगभग", min: "मिनट", items: "आइटम",
    table: "टेबल", pairs: "इसके साथ अच्छा लगेगा", off: "छूट", rateTitle: "आपका खाना कैसा था?", submit: "भेजें",
    thanks: "धन्यवाद!", received: "ऑर्डर मिल गया", preparing: "तैयार हो रहा है", ready: "परोसने के लिए तैयार",
    served: "परोसा गया", loading: "लोड हो रहा है...", enjoy: "आपका खाना हाज़िर है।", est: "तैयार होने में लगभग", total: "कुल" },
  te: { callWaiter: "వెయిటర్‌ను పిలవండి", bill: "బిల్లు కావాలి", vegOnly: "శాకాహారం మాత్రమే", add: "జోడించు", soldOut: "అయిపోయింది",
    confirm: "ఆర్డర్ నిర్ధారించండి", placing: "ఆర్డర్ చేస్తున్నాం...", readyIn: "సిద్ధం కావడానికి సుమారు", min: "నిమిషాలు", items: "వస్తువులు",
    table: "టేబుల్", pairs: "దీనితో బాగుంటుంది", off: "తగ్గింపు", rateTitle: "మీ భోజనం ఎలా ఉంది?", submit: "పంపండి",
    thanks: "ధన్యవాదాలు!", received: "ఆర్డర్ అందింది", preparing: "తయారవుతోంది", ready: "వడ్డించడానికి సిద్ధం",
    served: "వడ్డించారు", loading: "లోడ్ అవుతోంది...", enjoy: "మీ ఆర్డర్ ఆస్వాదించండి.", est: "సిద్ధం కావడానికి సుమారు", total: "మొత్తం" },
};

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const s = localStorage.getItem("velora-lang") as Lang | null;
      if (s && s in T) setLang(s);
    } catch {}
  }, []);
  const set = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem("velora-lang", l); } catch {}
  };
  return [lang, set];
}

export function LangSwitch({ lang, set }: { lang: Lang; set: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 text-xs">
      {([["en", "EN"], ["hi", "हिं"], ["te", "తె"]] as [Lang, string][]).map(([k, label]) => (
        <button key={k} onClick={() => set(k)}
          className={`rounded-full px-3 py-1 ${lang === k ? "bg-gold text-ink" : "border border-gold/30 text-bone/70"}`}>{label}</button>
      ))}
    </div>
  );
}
