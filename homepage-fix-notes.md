# Homepage Category Fix Notes

After changing `arts.length >= 1` to `arts.length >= 3`:

- The homepage no longer shows dedicated category sections with sparse articles (1-2)
- The bottom section shows articles in a 3-column grid (items 2-7 visible) with mixed categories: TECH, TECH, CORPORATE
- These appear to be in the "remaining articles" area, not in dedicated category sections
- No category headers with only 1-2 articles visible
- The fix is working as expected — categories with fewer than 3 articles now flow into the general grid

The initial 20 articles are split: featured(1) + secondary(2) + editors(4) + midFeature(6) = 13, leaving 7 for remaining/categories.
With only 7 remaining articles, it's hard to get 3+ in any single category, so they all go to the general grid.
When "Load More" is clicked and more articles load, categories with 3+ articles will get their own sections.
