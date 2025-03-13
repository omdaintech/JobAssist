
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '#' },
        { name: 'Pricing', href: '#' },
        { name: 'FAQs', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'CV Templates', href: '#' },
        { name: 'Cover Letter Guide', href: '#' },
        { name: 'Interview Tips', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '#' },
        { name: 'Privacy', href: '#' },
        { name: 'Terms', href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="inline-block mb-4">
              <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                JobAssist
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              An AI-powered job assistant to help you find and apply for jobs effortlessly.
            </p>
          </div>
          
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="font-medium mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground hover-transition"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} JobAssist. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-foreground hover-transition">
              Twitter
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground hover-transition">
              LinkedIn
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground hover-transition">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
