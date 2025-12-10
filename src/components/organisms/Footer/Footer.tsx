import Link from 'next/link';
import './index.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* About */}
          <div className="footer-column">
            <h3 className="footer-heading">About Asharvi</h3>
            <p className="footer-description">
              Evidence-based child behavior strategies for parents, teachers, and counselors.
            </p>
          </div>

          {/* Courses */}
          <div className="footer-column">
            <h3 className="footer-heading">Courses</h3>
            <ul className="footer-links">
              <li><Link href="/courses">Browse All</Link></li>
              <li><Link href="/courses?category=parenting">Parenting</Link></li>
              <li><Link href="/courses?category=classroom">Classroom Management</Link></li>
              <li><Link href="/courses?category=special-needs">Special Needs</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="footer-column">
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-links">
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/faq">FAQs</Link></li>
              <li><Link href="/community">Community</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="footer-column">
            <h3 className="footer-heading">Legal</h3>
            <ul className="footer-links">
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/cookies">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div className="footer-column">
            <h3 className="footer-heading">Connect</h3>
            <div className="social-links">
              <a href="https://facebook.com/ashravi" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <span className="social-icon">📘</span>
              </a>
              <a href="https://twitter.com/ashravi" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                <span className="social-icon">🐦</span>
              </a>
              <a href="https://linkedin.com/company/ashravi" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <span className="social-icon">💼</span>
              </a>
              <a href="https://instagram.com/ashravi" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <span className="social-icon">📷</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Asharvi. All rights reserved.
          </p>
          <p className="footer-reminder">
            Not a member yet? <Link href="/auth/signup" className="footer-link-highlight">Sign up for free</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
