// Database configuration
const SUPABASE_CONFIG = {
    url: 'https://xarftlanzdfuzwrfewqw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcmZ0bGFuemRmdXp3cmZld3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NTAwMTUsImV4cCI6MjEwOTIyNjAxNX0.PrsAQsjGC_O10YeFcAbSz80pJwdzwoFfqGDK6YljuX0'
};

// Initialize Supabase client (using CDN version)
let sbClient = null;

function initSupabase() {
    try {
        sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✓ Supabase initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Save rating to Supabase
async function saveRatingToDatabase(title, rating, imdb_id = null) {
    if (!sbClient) return false;
    
    try {
        const { data, error } = await sbClient
            .from('ratings')
            .upsert({
                show_title: title,
                rating: rating,
                imdb_id: imdb_id,
                rated_at: new Date().toISOString(),
                user_agent: navigator.userAgent.substring(0, 100)
            }, {
                onConflict: 'show_title',
                ignoreDuplicates: false
            });
        
        if (error) throw error;
        console.log('✓ Rating saved to database:', title, rating);
        return true;
    } catch (error) {
        console.error('Failed to save to database:', error);
        return false;
    }
}

// Load existing ratings from database on startup
async function loadRatingsFromDatabase() {
    if (!sbClient) return;
    
    try {
        const { data, error } = await sbClient
            .from('ratings')
            .select('show_title, rating')
            .order('rated_at', { ascending: false });
        
        if (error) throw error;
        
        // Merge with localStorage
        if (data && data.length > 0) {
            console.log(`✓ Loaded ${data.length} ratings from database`);
            data.forEach(item => {
                userRatings[item.show_title] = item.rating;
                // Mark as Watched
                userStatuses[item.show_title] = 'Watched';
            });
            saveUserData(); // Save to localStorage as backup
        }
    } catch (error) {
        console.error('Failed to load from database:', error);
    }
}
