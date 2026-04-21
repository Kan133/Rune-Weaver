import { FeatureDetailContent } from './FeatureDetailContent';
import {
  refreshFeatureAfterUpdate,
  shouldRefreshAfterUpdateSuccess,
  useFeatureDetailController,
} from './useFeatureDetailController';

export { refreshFeatureAfterUpdate, shouldRefreshAfterUpdateSuccess };

export function FeatureDetail() {
  const controller = useFeatureDetailController();
  return <FeatureDetailContent controller={controller} />;
}
