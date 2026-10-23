interface ExtensionSender {
  id?: string;
  url?: string;
  origin?: string;
}
declare const chrome: {
  tabs: {
    create(options: {
      url: string;
    }): Promise<unknown>;
  };
  storage: {
    local: {
      setAccessLevel(options: {
        accessLevel: 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS';
      }): Promise<void>;
      get(key: string): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
    };
  };
  runtime: {
    id: string;
    getURL(path: string): string;
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: ExtensionSender,
          respond: (response: unknown) => void,
        ) => boolean,
      ): void;
    };
    sendMessage(message: unknown): Promise<unknown>;
  };
};
