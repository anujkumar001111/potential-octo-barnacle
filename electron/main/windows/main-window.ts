  private async showLoading(): Promise<void> {
    const loadingPath = isDev
      ? path.join(process.cwd(), 'electron/renderer/loading/index.html')
      : path.join(app.getAppPath(), 'renderer/loading/index.html');

    const loadingURL = `file://${loadingPath}`;
    console.log('Loading transition page:', loadingURL);

    this.window = await createWindow(loadingURL);
    this.updateState(WindowState.LOADING, 'Starting service...');

    // Add CSP headers to the main window
    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [buildCSPString()]
        }
      });
    });

    console.log('Transition page loaded');
  }