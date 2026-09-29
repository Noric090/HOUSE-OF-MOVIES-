# HOUSE OF MOVIES — Version 3

A modern streaming-style website with a Supabase backend.

## Included
- Public movie/series catalog
- Search and genre filtering
- Movie/series details
- Seasons and episodes
- 480p / 720p / 1080p links
- Admin email/password login
- Admin CRUD for titles, seasons, episodes and download links
- Poster URLs (image upload can be added through Supabase Storage)
- Supabase Row Level Security policies
- Responsive dark UI

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Create an Auth user in Supabase Authentication > Users.
4. In the SQL editor, replace `YOUR_ADMIN_EMAIL@example.com` in the final section of `schema.sql` with the admin email, then run that section.
5. Open `js/config.js` and enter your Supabase project URL and publishable/anon key.
6. Serve the folder from a local web server (for example VS Code Live Server), or deploy the static files to Netlify/Vercel/GitHub Pages.
7. Open `admin.html` and sign in.

IMPORTANT: Never put a Supabase service-role/secret key in browser code. The frontend must use only the publishable/anon key with RLS enabled.

This project is designed for movies/series you own or are authorized to distribute. Add only lawful media and links.


## V3.1 one-screen publishing

In Admin > Titles, **Add title** now provides:
- Poster image upload to Supabase Storage
- Movie/series details
- 480p URL
- 720p URL
- 1080p URL
- Published checkbox

Click **Save & Publish** to save the title and quality links. Run the updated `supabase/schema.sql` first so the `posters` storage bucket and policies exist.

For series, create the series, then create its seasons and episodes. The existing public page reads episode download links from `download_links`.
