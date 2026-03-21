-- Add FULLTEXT index on articles(headline, subheadline, body) for fast full-text search
-- Replaces LIKE '%query%' and in-memory Levenshtein matching
-- Target: sub-200ms queries on 100K+ articles

ALTER TABLE `articles` ADD FULLTEXT INDEX `ft_articles_search` (`headline`, `subheadline`, `body`);
