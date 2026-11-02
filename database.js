// Database configuration
// These values will be provided by Hemant after setting up Supabase
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Will be replaced with actual URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Safe to expose - restricted by RLS
};

// Initialize Supabase client (using CDN version)
let supabase = null;

function initSupabase() {
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase not configured. Using localStorage only.');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Save rating to Supabase
async function saveRatingToDatabase(title, rating, imdb_id = null) {
    if (!supabase) return false;
    
    try {
        const { data, error } = await supabase
            .from('ratings')
            .upsert({
                show_title: title,
                rating: rating,
                imdb_id: imdb_id,
                rated_at: new Date().toISOString(),
                user_agent: navigator.userAgent.substring(0, 100) // For basic tracking
            }, {
                onConflict: 'show_title'
            });
        
        if (error) throw error;
        console.log('Rating saved to database:', title, rating);
        return true;
    } catch (error) {
        console.error('Failed to save to database:', error);
        return false;
    }
}

// Load existing ratings from database on startup
async function loadRatingsFromDatabase() {
    if (!supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('ratings')
            .select('show_title, rating')
            .order('rated_at', { ascending: false });
        
        if (error) throw error;
        
        // Merge with localStorage
        if (data && data.length > 0) {
            data.forEach(item => {
                userRatings[item.show_title] = item.rating;
            });
            console.log(`Loaded ${data.length} ratings from database`);
            saveUserData(); // Save to localStorage as backup
        }
    } catch (error) {
        console.error('Failed to load from database:', error);
    }
}
