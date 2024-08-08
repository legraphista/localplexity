import React, {useEffect, useRef, useState} from 'react'


type ProviderChildren<Store extends new (...args: any[]) => InstanceType<Store>> =
  | { children: React.ReactNode }
  | { children: React.ReactNode, staticStore: InstanceType<Store> }
  | { children: React.ReactNode, arguments: ConstructorParameters<Store> }

type Lifecycle<S extends new (...args: any[]) => InstanceType<S>> = {
  init?: (instance: InstanceType<S>) => void
  dispose?: (instance: InstanceType<S>) => void
}

export const createContext = <S extends new (...args: any[]) => InstanceType<S>>(Store: S, {
  init,
  dispose
}: Lifecycle<S> = {}) => {
  const context = React.createContext<InstanceType<typeof Store> | null>(null);

  const Provider = (props: ProviderChildren<S>): React.JSX.Element => {
    const {children} = props;
    const staticStore = 'staticStore' in props ? props.staticStore : null;
    const args = 'arguments' in props ? props.arguments : [] as const;

    const firstArgsBypass = useRef(true);

    const [store, setStore] = useState<InstanceType<S>>(staticStore || (() => new Store(...args)));
    useEffect(() => {
      init?.(store);

      return () => dispose?.(store);
    }, [store]);

    useEffect(() => {
      if(staticStore) return;
      if(firstArgsBypass.current) {
        firstArgsBypass.current = false;
        return;
      }
      setStore(new Store(...args));
    }, args);

    return React.createElement(context.Provider, {value: store}, children);
  }

  const useStore = (): InstanceType<typeof Store> => {
    const store = React.useContext(context);
    if (!store) {
      throw new Error(`No context found for ${Store.prototype.constructor.name}`);
    }
    return store;
  }

  return {Provider, useStore};
}