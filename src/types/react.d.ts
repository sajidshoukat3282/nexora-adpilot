/**
 * Minimal ambient React type declarations.
 *
 * @types/react is not available in this offline environment (no npm
 * registry access, and no vendored copy exists anywhere on disk — verified
 * during the Phase 0 architecture review). React and ReactDOM themselves
 * ARE the real packages; only their separately-published type declarations
 * are missing.
 *
 * This provides enough typing — including the `React.FC` / `React.MouseEvent`
 * namespace-style references used throughout this codebase — to get real
 * value from TypeScript on the app's own code (domain models, repository
 * interfaces, component props) without reproducing DefinitelyTyped's
 * thousands of lines of exhaustive per-element JSX attribute typing.
 * Intrinsic element attributes are intentionally permissive.
 */

declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type Key = string | number;
  type DependencyList = ReadonlyArray<any>;
  type CSSProperties = { [key: string]: string | number | undefined };

  interface SyntheticEvent<T = Element> {
    currentTarget: T;
    target: EventTarget & { value?: any; checked?: any };
    preventDefault(): void;
    stopPropagation(): void;
  }
  interface MouseEvent<T = Element> extends SyntheticEvent<T> {
    clientX: number;
    clientY: number;
  }
  interface KeyboardEvent<T = Element> extends SyntheticEvent<T> {
    key: string;
  }
  interface ChangeEvent<T = Element> extends SyntheticEvent<T> {
    target: EventTarget & T & { value: string; checked?: boolean };
  }
  interface FocusEvent<T = Element> extends SyntheticEvent<T> {}

  interface SVGAttributes<T> {
    className?: string;
    style?: CSSProperties;
    onClick?: (e: MouseEvent<T>) => void;
    [key: string]: any;
  }

  interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement | null;
  }
  type FunctionComponent<P = {}> = FC<P>;
  type PropsWithChildren<P = {}> = P & { children?: ReactNode };

  interface MutableRefObject<T> {
    current: T;
  }
  interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
  }
  interface Dispatch<A> {
    (value: A): void;
  }
  type SetStateAction<S> = S | ((prev: S) => S);

  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  function useLayoutEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  function useRef<T>(initial: T): MutableRefObject<T>;
  function useRef<T = undefined>(initial: null): MutableRefObject<T | null>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps: DependencyList): T;
  function useMemo<T>(fn: () => T, deps: DependencyList): T;
  function useContext<T>(ctx: Context<T>): T;
  function createContext<T>(defaultValue: T): Context<T>;
  function createElement(type: any, props?: any, ...children: any[]): ReactElement;

  const StrictMode: FC<{ children?: ReactNode }>;
  const Fragment: FC<{ children?: ReactNode }>;
}

declare module "react" {
  export = React;
  export as namespace React;
}

declare module "react-dom/client" {
  export interface Root {
    render(children: any): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module "react/jsx-runtime" {
  const jsxRuntime: any;
  export default jsxRuntime;
}

/** Permissive JSX namespace — real per-element attribute typing lives in
 *  DefinitelyTyped, not reproduced here. Component prop types (the ones
 *  that actually catch bugs in this codebase) are still fully checked. */
declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  type IntrinsicElements = {
    [elemName: string]: any;
  };
  type Element = any;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
