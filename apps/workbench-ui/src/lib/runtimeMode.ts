type WorkbenchImportMetaEnv = {
  DEV?: unknown;
  MODE?: unknown;
};

function getWorkbenchImportMetaEnv(): WorkbenchImportMetaEnv | undefined {
  return (import.meta as ImportMeta & { env?: WorkbenchImportMetaEnv }).env;
}

export function isWorkbenchDevOrTestMode(): boolean {
  const env = getWorkbenchImportMetaEnv();
  return Boolean(env?.DEV || env?.MODE === 'test');
}

export function isWorkbenchDevMode(): boolean {
  return Boolean(getWorkbenchImportMetaEnv()?.DEV);
}
