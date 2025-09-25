"use client";

import { useEffect } from "react";
import AOS from "aos";

export function AOSInitializer() {
  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: "ease-out-cubic",
      offset: 120,
      once: true,
    });
  }, []);

  return null;
}
