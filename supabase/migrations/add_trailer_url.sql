-- Add trailer_url column to movies table
ALTER TABLE movies 
ADD COLUMN trailer_url TEXT DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN movies.trailer_url IS 'External link to the trailer (YouTube, Vimeo, etc.)';
