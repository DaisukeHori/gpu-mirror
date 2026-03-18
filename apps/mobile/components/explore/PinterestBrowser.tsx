import { Platform } from 'react-native';
import type { SelectedStyle } from '../../lib/types';

interface PinterestBrowserProps {
  sessionId: string;
  onSelectImage: (style: SelectedStyle) => void;
}

const PinterestBrowserComponent =
  Platform.OS === 'web'
    ? require('./PinterestBrowser.web').PinterestBrowser
    : require('./PinterestBrowser.native').PinterestBrowser;

export function PinterestBrowser(props: PinterestBrowserProps) {
  return <PinterestBrowserComponent {...props} />;
}
