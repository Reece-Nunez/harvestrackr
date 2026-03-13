export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-center py-6 text-sm text-muted-foreground">
      &copy; {currentYear} HarvesTrackr. All rights reserved.
    </footer>
  );
}
