import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  buttonText?: string;
  buttonHref?: string;
}

export function PricingCard({
  name,
  description,
  price,
  period = "/month",
  features,
  highlighted = false,
  buttonText = "Get Started",
  buttonHref = "/signup",
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all hover:shadow-lg",
        highlighted && "border-green-600 shadow-lg"
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-6">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          {price !== "Free" && price !== "Custom" && (
            <span className="text-muted-foreground">{period}</span>
          )}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className={cn(
            "w-full",
            highlighted
              ? "bg-green-600 hover:bg-green-700"
              : "bg-foreground hover:bg-foreground/90"
          )}
        >
          <Link href={buttonHref}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
