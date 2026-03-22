import { forwardRef } from 'react';
import { Platform } from 'react-native';
import type { SelectedStyle } from '../../lib/types';

export type { PinterestBrowserHandle } from './PinterestBrowser.native';

interface PinterestBrowserProps {
  sessionId: string;
  onSelectImage: (style: SelectedStyle) => void;
  onPinDetailChange?: (isPinDetail: boolean) => void;
  onImportStart?: () => void;
  onImportEnd?: () => void;
}

const PinterestBrowserComponent =
  Platform.OS === 'web'
    ? require('./PinterestBrowser.web').PinterestBrowser
    : require('./PinterestBrowser.native').PinterestBrowser;

export const PinterestBrowser = forwardRef<unknown, PinterestBrowserProps>(
  function PinterestBrowser(props, ref) {
    return <PinterestBrowserComponent ref={ref} {...props} />;
  },
);
