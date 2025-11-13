import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { WindowState, type WindowStateInfo } from './window-states';
import { ServerManager } from '../services/server-manager';
import { createWindow } from '../ui/window';
import { isDev } from '../utils/constants';
import { buildCSPString } from '../security/csp-config';