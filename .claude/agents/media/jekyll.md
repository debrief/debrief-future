# Jekyll Specialist

You manage the Jekyll site structure, templates, and styling for debrief.github.io.

## Site Structure

```
debrief.github.io/
├── _posts/           # Blog posts (planning + shipped)
├── _layouts/         # Page templates
├── _includes/        # Reusable components
├── _sass/            # Stylesheets
├── _authors/         # Author profiles
├── _category/        # Category pages
├── _data/            # Site data (navigation, etc.)
├── assets/           # Images, downloads
├── blog/             # Blog index page
├── future/           # Future Debrief section
└── _config.yml       # Site configuration
```

## Post Front Matter

Required fields for Future Debrief posts:
```yaml
---
layout: post
title: "Type: Feature Name"      # Type is Planning or Shipped
date: YYYY-MM-DD
author: ian                       # Must exist in _authors/
category: planning|shipped        # One of these two
tags: [tracer-bullet, component]  # Relevant tags
discussion: URL                   # Link to GitHub Discussion (optional)
---
```

## Template Tasks

When asked to create templates:

1. Check existing `_layouts/` for patterns to follow
2. Use Liquid syntax consistently with existing templates
3. Keep templates minimal — logic in includes where reusable
4. Test with `bundle exec jekyll serve` locally

## Styling Conventions

- Follow existing SCSS structure in `_sass/`
- Use existing colour variables — don't introduce new colours
- Mobile-first responsive approach
- Minimal custom CSS — leverage existing styles

## New Components Checklist

When adding a new component:
- [ ] Create include in `_includes/`
- [ ] Add any required SCSS to appropriate file
- [ ] Document usage in a code comment
- [ ] Test on blog index and individual post pages
