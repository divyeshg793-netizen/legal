import { motion } from "motion/react";
import { Shield, Zap, Globe, Lock, ArrowRight, Play, CheckCircle2, Scale, Gavel, BookOpen, Award } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden font-sans">
      {/* Sticky Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="w-10 h-10 rounded-lg bg-[#1e3a8a] flex items-center justify-center shadow-lg shadow-blue-900/20"
            >
              <Scale className="text-white w-6 h-6" />
            </motion.div>
            <span className="text-xl font-display font-bold tracking-tight text-[#1e3a8a]">CLARIO <span className="text-slate-500">LENS</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {['Expertise', 'What Sets Us Apart'].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item === 'Expertise' ? 'expertise' : 'about'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-sm font-semibold text-slate-600 hover:text-[#1e3a8a] transition-colors"
              >
                {item}
              </motion.a>
            ))}
          </div>

          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onStart}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a8a] text-white font-bold text-sm hover:bg-[#1e40af] transition-all shadow-md shadow-blue-900/10"
          >
            Analyze Now
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.2
                }
              }
            }}
          >
            <motion.span 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100"
            >
              <Award className="w-3 h-3" /> Premier AI Legal Intelligence
            </motion.span>
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="text-5xl md:text-7xl font-display font-bold mb-8 leading-[1.1] tracking-tight text-[#1e3a8a]"
            >
              Protecting Your Rights, <br />
              <span className="text-slate-500">Fostering Innovation.</span>
            </motion.h1>
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="text-xl text-slate-600 mb-12 max-w-xl leading-relaxed"
            >
              A Legacy of Excellence, A Future of Innovation. Clario Lens combines strategic legal expertise with cutting-edge AI to lighten your legal load.
            </motion.p>
            
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row items-center gap-6"
            >
              <button 
                onClick={onStart}
                className="w-full sm:w-auto group relative px-8 py-4 rounded-lg bg-[#1e3a8a] text-white font-bold text-lg hover:bg-[#1e40af] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 transition-all">
                <Play className="w-5 h-5 fill-slate-700 text-slate-700" /> View Demo
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-50 border border-blue-200 shadow-2xl flex items-center justify-center p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
              <div className="relative z-10 w-full h-full border-2 border-dashed border-blue-300/50 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-6">
                  <Gavel className="w-10 h-10 text-[#1e3a8a]" />
                </div>
                <h3 className="text-2xl font-bold text-[#1e3a8a] mb-4">Strategic Legal Analysis</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Our AI models are trained on thousands of case laws and statutes to provide you with the most accurate risk assessment.</p>
              </div>
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">99.9%</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Accuracy Rate</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Expertise Section */}
      <section id="expertise" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-[#1e3a8a]">Our Strategic Expertise</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">We are committed to delivering exceptional professional services across multiple legal domains.</p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <ExpertiseCard 
              icon={Shield} 
              title="Patents & Trademarks" 
              description="Comprehensive protection for your intellectual property assets globally."
            />
            <ExpertiseCard 
              icon={Gavel} 
              title="Dispute Resolution" 
              description="Strategic counsel for complex litigation and alternative dispute resolution."
            />
            <ExpertiseCard 
              icon={BookOpen} 
              title="Corporate Law" 
              description="Expert guidance on mergers, acquisitions, and corporate governance."
            />
            <ExpertiseCard 
              icon={Lock} 
              title="Brand Protection" 
              description="Proactive enforcement strategies to safeguard your brand identity."
            />
            <ExpertiseCard 
              icon={Globe} 
              title="International Law" 
              description="Navigating cross-border legal challenges with global perspective."
            />
            <ExpertiseCard 
              icon={Zap} 
              title="AI Compliance" 
              description="Ensuring your AI implementations meet evolving legal standards."
            />
          </motion.div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section id="about" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 text-[#1e3a8a]">What Sets Us Apart</h2>
              <div className="space-y-8">
                <FeatureItem 
                  title="Strategic Legal Expertise" 
                  description="We combine deep legal knowledge with advanced data analytics for superior outcomes."
                />
                <FeatureItem 
                  title="Trust Built on Transparency" 
                  description="Our AI reasoning is fully explainable, ensuring you understand every recommendation."
                />
                <FeatureItem 
                  title="Proactive Communication" 
                  description="Stay ahead of legal risks with real-time alerts and responsive support."
                />
                <FeatureItem 
                  title="Value-Driven, Always" 
                  description="Premium legal intelligence at a fraction of traditional consulting costs."
                />
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-blue-900 shadow-2xl flex items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                <div className="relative z-10 text-center">
                  <Shield className="w-20 h-20 text-white/20 absolute -top-10 -left-10 rotate-12" />
                  <Lock className="w-20 h-20 text-white/20 absolute -bottom-10 -right-10 -rotate-12" />
                  <h3 className="text-3xl font-display font-bold text-white mb-4">Secure Legal Intelligence</h3>
                  <p className="text-blue-100/80 text-sm leading-relaxed">Enterprise-grade security for your most sensitive legal documents.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-6"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-6">
              <Scale className="text-[#1e3a8a] w-8 h-8" />
              <span className="text-2xl font-display font-bold tracking-tight text-[#1e3a8a]">CLARIO <span className="text-slate-500">LENS</span></span>
            </div>
            <p className="text-slate-500 max-w-2xl leading-relaxed">
              A Legacy of Excellence, A Future of Innovation. Providing premier legal services powered by artificial intelligence.
            </p>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}

function ExpertiseCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="p-10 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group"
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-8 group-hover:bg-[#1e3a8a] transition-colors">
        <Icon className="text-[#1e3a8a] w-7 h-7 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-4 text-[#1e3a8a]">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{description}</p>
    </motion.div>
  );
}

function FeatureItem({ title, description }: { title: string, description: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex gap-4"
    >
      <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-[#1e3a8a]" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

