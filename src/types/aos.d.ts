declare module "aos" {
  interface AOSInitOptions {
    offset?: number;
    delay?: number;
    duration?: number;
    easing?: string;
    once?: boolean;
    mirror?: boolean;
    anchorPlacement?: string;
  }

  interface AOSInstance {
    init(options?: AOSInitOptions): void;
    refresh(): void;
    refreshHard(): void;
  }

  const AOS: AOSInstance;
  export default AOS;
}
