import { APP_VERSION } from '../config/version';

const VersionBadge = () => {
  return (
    <div className="fixed bottom-2 right-2 z-50">
      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-80 hover:opacity-100 transition-opacity cursor-default">
        v{APP_VERSION}
      </div>
    </div>
  );
};

export default VersionBadge;

