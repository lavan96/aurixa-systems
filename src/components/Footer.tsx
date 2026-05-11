import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="bg-[#040B16] border-t border-[#00A8B5]/20 pt-20 pb-10 w-full mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0055FF]/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20 w-full mb-16">
          <div className="col-span-1 md:col-span-1">
            <BrandLogo className="mb-8 h-28 w-[430px] max-w-full sm:w-[520px]" />
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              The indispensable backbone of industrial innovation. Bridging property and financial intelligence for serious advisory firms.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Platform</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link to="/platform" className="hover:text-white transition-colors">Serviceability Engine</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Cash Flow Modelling</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Strategic Reporting</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Property Intelligence</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Security & Trust</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Solutions</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link to="/industries" className="hover:text-white transition-colors">For Buyers Agents</Link></li>
              <li><Link to="/industries" className="hover:text-white transition-colors">For Wealth Advisors</Link></li>
              <li><Link to="/industries" className="hover:text-white transition-colors">For Enterprise Firms</Link></li>
              <li><Link to="/solutions" className="hover:text-white transition-colors">Client Reporting</Link></li>
              <li><Link to="/solutions" className="hover:text-white transition-colors">Compliance OS</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Company</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Aurixa</Link></li>
              <li><Link to="/resources" className="hover:text-white transition-colors">Intelligence Hub</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Join Waitlist</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Legal & Privacy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="w-full pt-8 border-t border-[#C89B3C]/15 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Aurixa Systems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
