import { MenuItem, Category, CategoryGroup } from '@/types/menu';
import { supabase } from '@/lib/supabase';

const VIDEO_EXPIRY = 60 * 60; // 1 hour in seconds

async function getSignedUrl(path: string): Promise<string> {
  console.log('Getting signed URL for path:', path);

  const { data, error } = await supabase.storage
    .from('Videos Platillos')
    .createSignedUrl(path, VIDEO_EXPIRY);

  if (error) {
    console.error('Error getting signed URL:', error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    console.error('No signed URL returned for path:', path);
    throw new Error('No signed URL returned');
  }

  console.log('Successfully got signed URL:', data.signedUrl.substring(0, 100) + '...');
  return data.signedUrl;
}

export async function fetchCategories(): Promise<Category[]> {
  console.log('Fetching categories...');

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  console.log('Fetching menu items...');

  const { data, error } = await supabase.from('platillos').select('*').order('id', {
    ascending: true,
  });

  if (error) {
    console.error('Error fetching menu items:', error);
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  // Sign URLs for video items
  const itemsWithSignedUrls = await Promise.all(
    (data || []).map(async (item, index) => {
      if (item.video_url.match(/\.(mp4|webm|mov)$/i)) {
        try {
          console.log('Getting signed URL for video:', item.video_url);
          const signedUrl = await getSignedUrl(item.video_url);
          console.log('Successfully signed video URL for item:', item.id);
          return { ...item, url: signedUrl };
        } catch (error) {
          console.error('Failed to sign URL for item:', item.id, error);
          return item;
        }
      }
      return item;
    })
  );
  return itemsWithSignedUrls;
}

export async function fetchCategorizedMenuItems(): Promise<CategoryGroup[]> {
  console.log('Fetching categorized menu items...');

  // Fetch categories and items in parallel
  const [categories, items] = await Promise.all([fetchCategories(), fetchMenuItems()]);

  console.log('Categories:', categories);
  console.log('Items:', items);

  // Group items by category
  const groupedItems = categories.map(category => ({
    category,
    items: items.filter(item => item.category_id === category.id),
  }));

  return groupedItems;
}

export async function prefetchVideo(url: string): Promise<void> {
  console.log('Starting video prefetch:', url.substring(0, 100) + '...');

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Prefetch response not OK:', response.status, response.statusText);
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('Got video blob, size:', blob.size);
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');

      video.onloadeddata = () => {
        console.log('Video preloaded successfully');
        URL.revokeObjectURL(objectUrl);
        resolve();
      };

      video.onerror = e => {
        console.error('Error preloading video:', e);
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video'));
      };

      video.src = objectUrl;
      video.load();
    });
  } catch (error) {
    console.error('Error in prefetchVideo:', error);
    throw error;
  }
}

export async function refreshVideoUrl(path: string): Promise<string> {
  console.log('Refreshing video URL for path:', path);
  try {
    const newUrl = await getSignedUrl(path);
    console.log('Successfully refreshed URL');
    return newUrl;
  } catch (error) {
    console.error('Error refreshing video URL:', error);
    throw error;
  }
}
