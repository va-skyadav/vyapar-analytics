import { Boxes, ShoppingCart, Users, ArrowUpRight } from "lucide-react";

const actions = [
  {
    key: "products",
    step: "01",
    title: "Products",
    description: "Manage items, prices & stock",
    href: "/products",
    icon: Boxes
  },
  {
    key: "customers",
    step: "02",
    title: "Customers",
    description: "Manage customers & credit",
    href: "/customers",
    icon: Users
  },
  {
    key: "sales",
    step: "03",
    title: "Record Sale",
    description: "Create a sale & update analytics",
    href: "/sales",
    icon: ShoppingCart
  }
];

export function BusinessQuickNav({ active }: { active: "products" | "customers" | "sales" }) {
  return (
    <nav className="businessQuickNav" aria-label="Business workflow">
      {actions.map(({ key, step, title, description, href, icon: Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`businessQuickNavItem ${active === key ? "active" : ""}`}
          aria-current={active === key ? "page" : undefined}
        >
          <span className="businessQuickNavIcon"><Icon size={19} strokeWidth={2} /></span>
          <span className="businessQuickNavCopy">
            <span className="businessQuickNavStep">{step}</span>
            <span className="businessQuickNavTitle">{title}</span>
            <span className="businessQuickNavDescription">{description}</span>
          </span>
          <ArrowUpRight className="businessQuickNavArrow" size={17} strokeWidth={2} />
        </a>
      ))}
    </nav>
  );
}
