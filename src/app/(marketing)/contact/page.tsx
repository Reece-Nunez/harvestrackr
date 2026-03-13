"use client";

import { useState } from "react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, MapPin, Phone, Send, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    question: "Is HarvesTrackr really free?",
    answer:
      "Yes! Our Starter plan is completely free for small farms with basic needs. You can track up to 100 transactions per month, scan 10 receipts, and manage one farm at no cost. Upgrade only when you need more features.",
  },
  {
    question: "Can I import my existing data?",
    answer:
      "Absolutely! HarvesTrackr supports CSV imports for both expenses and income. You can easily migrate data from spreadsheets or other software. Our column mapper makes it simple to match your data fields.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is our top priority. We use bank-level encryption for all data transmission and storage. Your farm data is stored securely in the cloud with automatic backups and is never shared with third parties.",
  },
  {
    question: "Can multiple people access my farm?",
    answer:
      "Yes! With our Professional and Enterprise plans, you can invite team members to help manage your farm. You control what each person can see and do with role-based permissions.",
  },
  {
    question: "Do you offer customer support?",
    answer:
      "We provide email support for all users and priority support for paid plans. Enterprise customers get a dedicated account manager. We also have a comprehensive help center with guides and tutorials.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel or downgrade your subscription at any time. There are no long-term contracts or cancellation fees. Your data remains accessible even if you downgrade to the free plan.",
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });

    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-green-50 to-background py-20 dark:from-green-950/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-green-200 bg-green-100 px-4 py-1.5 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              <Leaf className="mr-2 h-4 w-4" />
              Get in Touch
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              We&apos;d Love to Hear from You
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Have questions about HarvesTrackr? Want to request a feature?
              We&apos;re here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div className="rounded-xl border bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold text-foreground">
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us more about your question or feedback..."
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="mb-6 text-2xl font-bold text-foreground">
                  Contact Information
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Prefer to reach out directly? Here&apos;s how you can contact
                  us.
                </p>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email</h3>
                      <p className="text-muted-foreground">
                        support@harvestrackr.com
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We respond within 24 hours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phone</h3>
                      <p className="text-muted-foreground">(555) 123-4567</p>
                      <p className="text-sm text-muted-foreground">
                        Mon-Fri 9am-5pm EST
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Office</h3>
                      <p className="text-muted-foreground">
                        123 Farm Road
                        <br />
                        Agriculture Valley, AV 12345
                        <br />
                        United States
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-12 rounded-xl bg-muted/50 p-6">
                <h3 className="mb-4 font-semibold text-foreground">
                  Quick Links
                </h3>
                <div className="grid gap-2">
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Help Center
                  </a>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    API Documentation
                  </a>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    System Status
                  </a>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Request a Feature
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  );
}
