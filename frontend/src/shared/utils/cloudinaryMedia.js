// Cloudinary transforms media on delivery when transformation parameters are
// inserted after "/upload/". This lets admins upload large originals while
// users download a small, web-optimised copy.
const CLOUDINARY_UPLOAD_PATTERN = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.+)$/i;

const parseCloudinaryUrl = (url) => {
  const match = String(url || '').match(CLOUDINARY_UPLOAD_PATTERN);
  if (!match) return null;
  return { prefix: match[1], resourceType: match[2].toLowerCase(), rest: match[3] };
};

const replaceExtension = (path, extension) => {
  const [pathname, query = ''] = path.split('?');
  const lastSlash = pathname.lastIndexOf('/');
  const lastDot = pathname.lastIndexOf('.');
  const base = lastDot > lastSlash ? pathname.slice(0, lastDot) : pathname;
  return `${base}.${extension}${query ? `?${query}` : ''}`;
};

export const isCloudinaryUrl = (url) => Boolean(parseCloudinaryUrl(url));

// 720p H.264 MP4 at automatic quality: plays everywhere and starts streaming
// immediately. A short banner clip comes out at a few MB.
export const getOptimizedVideoUrl = (url, { width = 720 } = {}) => {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed || parsed.resourceType !== 'video') return url;
  return `${parsed.prefix}q_auto,vc_h264,w_${width},c_limit/${replaceExtension(parsed.rest, 'mp4')}`;
};

// First frame of a Cloudinary video as a small JPG, for use as a poster.
export const getVideoPosterUrl = (url, { width = 720 } = {}) => {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed || parsed.resourceType !== 'video') return '';
  return `${parsed.prefix}so_0,q_auto,w_${width},c_limit/${replaceExtension(parsed.rest, 'jpg')}`;
};

export const getOptimizedImageUrl = (url, { width = 1080 } = {}) => {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed || parsed.resourceType !== 'image') return url;
  return `${parsed.prefix}f_auto,q_auto,w_${width},c_limit/${parsed.rest}`;
};

// True on 2G/3G or when the user has turned on data saver.
export const prefersReducedData = () => {
  const connection = typeof navigator !== 'undefined'
    ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
    : null;
  if (!connection) return false;
  return Boolean(connection.saveData) || ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
};
