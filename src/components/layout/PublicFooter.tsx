import { Link } from "react-router-dom";

export const PublicFooter = () => (
  <footer className="border-t border-border/60 bg-muted/20">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-foreground">Tender Compass</span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Search, track, and get alerted on procurement tenders across Africa.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="space-y-2">
            <div className="font-medium text-foreground">Product</div>
            <Link to="/tenders" className="block text-muted-foreground hover:text-foreground">
              Browse tenders
            </Link>
            <Link to="/blog" className="block text-muted-foreground hover:text-foreground">
              Blog
            </Link>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-foreground">Account</div>
            <Link to="/login" className="block text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link to="/login?mode=signup" className="block text-muted-foreground hover:text-foreground">
              Sign up
            </Link>
          </div>
        </nav>
      </div>

      <div className="mt-8 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tender Compass. All rights reserved.
      </div>
    </div>
  </footer>
);
