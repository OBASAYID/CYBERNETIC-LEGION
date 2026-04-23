#!/usr/bin/env node

/**
 * CYRUS Data Feeding Script
 * Continuously feeds fresh data to the AI model from various sources
 */

import axios from 'axios';

const DATA_SOURCES = {
  // News and current events
  news: [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.cnn.com/rss/edition.rss',
    'https://feeds.npr.org/1001/rss.xml',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://www.theverge.com/rss/index.xml',
    'https://techcrunch.com/feed/'
  ],

  // Science and research
  science: [
    'https://www.sciencedaily.com/rss/all.xml',
    'https://phys.org/rss-feed/',
    'https://www.nature.com/nature.rss'
  ],

  // Business and finance
  business: [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.reuters.com/rssFeed/topNews/',
    'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'
  ],

  // AI and tech research
  ai_research: [
    'https://ai.google/research/',
    'https://www.deepmind.com/research',
    'https://research.facebook.com/ai/',
    'https://www.microsoft.com/en-us/research/research-area/artificial-intelligence/',
    'https://arxiv.org/list/cs.AI/recent'
  ],

  // Robotics and mechatronics - COMPREHENSIVE ALL-DOMAIN COVERAGE
  robotics: [
    // Robotics organizations and news
    'https://spectrum.ieee.org/rss/robotics',
    'https://spectrum.ieee.org/rss/robotics/full/',
    'https://spectrum.ieee.org/rss/automaton/full/',
    'https://www.robotics.org/rss.xml',
    'https://www.therobotreport.com/feed/',
    'https://www.roboticsbusinessreview.com/feed/',
    'https://www.designworldonline.com/rss/',
    'https://www.controleng.com/rss/',
    'https://www.automationworld.com/rss/',
    'https://www.robotics.org/',
    'https://www.bostondynamics.com/',
    'https://www.nasa.gov/robotics',
    
    // Research and academic
    'https://arxiv.org/rss/cs.RO',
    'https://arxiv.org/rss/cs.SY',
    'https://ieeexplore.ieee.org/rss/TOC5.xml',
    'https://www.sciencedirect.com/rss',
    'https://www.springer.com/rss',
    'https://www.cambridge.org/core/rss',
    
    // Standards and regulations
    'https://www.iso.org/rss',
    'https://standards.ieee.org/rss',
    'https://www.asme.org/rss',
    'https://www.sae.org/rss/news',
    'https://www.astm.org/rss',
    'https://www.nfpa.org/rss',
    
    // Government and regulatory
    'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    'https://www.darpa.mil/rss.xml',
    'https://www.energy.gov/rss.xml',
    'https://www.doe.gov/rss',
    'https://www.nist.gov/rss',
    'https://www.nsf.gov/rss',
    'https://www.defense.gov/rss',
    'https://www.state.gov/rss',
    'https://www.transportation.gov/rss',
    'https://www.faa.gov/rss',
    
    // Actuators and motors
    'https://www.thomsonlinear.com/rss',
    'https://www.electromate.com/rss',
    'https://www.maxongroup.com/rss',
    'https://www.faulhaber.com/rss',
    
    // Sensors and sensing
    'https://www.te.com/rss',
    'https://www.microchip.com/rss',
    'https://www.analog.com/rss',
    'https://www.ti.com/rss'
  ],

  // Mechatronics components and technical documentation - ALL DOMAINS
  mechatronics: [
    // Component manufacturers and technical docs
    'https://www.digikey.com/rss',
    'https://www.mouser.com/rss',
    'https://www.newark.com/rss',
    'https://www.farnell.com/rss',
    
    // Motion control and drives
    'https://www.abb.com/rss',
    'https://www.siemens.com/rss',
    'https://www.schneider-electric.com/rss',
    'https://www.rockwellautomation.com/rss',
    
    // Sensors and instrumentation
    'https://www.omega.com/rss',
    'https://www.fluke.com/rss',
    'https://www.keysight.com/rss',
    'https://www.tek.com/rss',
    
    // Materials and advanced tech
    'https://www.azom.com/rss',
    'https://www.materialstoday.com/rss',
    
    // Standards and organizations
    'https://www.iso.org/rss',
    'https://www.asme.org/rss',
    'https://www.sae.org/rss/standards',
    'https://www.astm.org/rss',
    
    // Educational and research
    'https://ocw.mit.edu/rss',
    'https://www.coursera.org/rss',
    'https://www.edx.org/rss',
    'https://www.udacity.com/rss',
    
    // Professional associations
    'https://www.asme.org/rss',
    'https://www.sae.org/rss',
    'https://www.isa.org/rss',
    'https://www.controleng.com/rss',
    'https://www.automationworld.com/rss',
    'https://www.designworldonline.com/rss'
  ],

  // Educational content, tutorials, and videos - COMPREHENSIVE
  education: [
    'https://machinelearningmastery.com/',
    'https://towardsdatascience.com/',
    'https://www.kdnuggets.com/',
    'https://www.analyticsvidhya.com/',
    'https://ocw.mit.edu/rss',
    'https://www.coursera.org/rss',
    'https://www.edx.org/rss',
    'https://www.udacity.com/rss',
    'https://www.khanacademy.org/rss',
    'https://www.codecademy.com/rss',
    'https://www.pluralsight.com/rss',
    'https://www.linkedin.com/learning/rss',
    'https://www.skillshare.com/rss',
    'https://www.masterclass.com/rss',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC8butISFwT-Wl7EV0hUK0BQ',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCvjgXvBlbQiydffZU7m1_aw'
  ],

  // Technical documentation and component databases - ALL TOOLS & LIBRARIES
  technical_docs: [
    'https://www.allaboutcircuits.com/rss',
    'https://www.electronics-tutorials.ws/',
    'https://www.engineersgarage.com/',
    'https://www.electrical4u.com/rss',
    'https://www.rfwireless-world.com/',
    'https://www.circuitstoday.com/rss',
    'https://www.electronicshub.org/rss',
    'https://www.elprocus.com/',
    'https://www.watelectronics.com/',
    'https://www.electronicsforu.com/rss',
    'https://www.ros.org/rss',
    'https://gazebosim.org/rss',
    'https://www.mathworks.com/rss',
    'https://www.solidworks.com/rss',
    'https://www.ptc.com/rss',
    'https://www.autodesk.com/rss',
    'https://www.arduino.cc/rss',
    'https://www.raspberrypi.org/rss',
    'https://opencv.org/rss',
    'https://pytorch.org/rss',
    'https://www.tensorflow.org/rss',
    'https://scikit-learn.org/rss'
  ]
};

const BASE_URL = 'http://localhost:5051';

class DataFeeder {
  constructor() {
    this.isRunning = false;
    this.feedInterval = 30 * 60 * 1000; // 30 minutes
  }

  async collectFromSource(type, urls) {
    console.log(`📡 Collecting ${type} data from ${urls.length} sources...`);

    try {
      const response = await axios.post(`${BASE_URL}/api/data-collection/collect/rss`, {
        urls: urls,
        categories: [type]
      });

      const results = response.data.results;
      const totalCollected = results.reduce((sum, r) => sum + r.collected, 0);
      const totalStored = results.reduce((sum, r) => sum + r.stored, 0);

      console.log(`✅ ${type}: ${totalCollected} items collected, ${totalStored} stored`);
      return { collected: totalCollected, stored: totalStored };
    } catch (error) {
      console.error(`❌ Failed to collect ${type} data:`, error.message);
      return { collected: 0, stored: 0 };
    }
  }

  async collectWebContent(urls, category = 'web') {
    console.log(`🌐 Collecting web content from ${urls.length} pages...`);

    try {
      const response = await axios.post(`${BASE_URL}/api/data-collection/collect/web`, {
        urls: urls,
        categories: [category]
      });

      const results = response.data.results;
      const totalCollected = results.reduce((sum, r) => sum + r.collected, 0);
      const totalStored = results.reduce((sum, r) => sum + r.stored, 0);

      console.log(`✅ Web content: ${totalCollected} pages collected, ${totalStored} stored`);
      return { collected: totalCollected, stored: totalStored };
    } catch (error) {
      console.error(`❌ Failed to collect web content:`, error.message);
      return { collected: 0, stored: 0 };
    }
  }

  async getStats() {
    try {
      const response = await axios.get(`${BASE_URL}/api/data-collection/stats`);
      return response.data.knowledgeBase.totalEntries;
    } catch (error) {
      console.error('Failed to get stats:', error.message);
      return 0;
    }
  }

  async runFeedCycle() {
    console.log('\n🚀 Starting data feed cycle...');
    const startTime = Date.now();
    const initialCount = await this.getStats();

    let totalCollected = 0;
    let totalStored = 0;

    // Collect from all RSS sources
    for (const [type, urls] of Object.entries(DATA_SOURCES)) {
      if (type !== 'ai_research' && type !== 'education' && type !== 'robotics') { // Skip web sources for now
        const result = await this.collectFromSource(type, urls);
        totalCollected += result.collected;
        totalStored += result.stored;

        // Small delay between collections
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Collect robotics data (always include in feed cycle)
    const roboticsResult = await this.collectFromSource('robotics', DATA_SOURCES.robotics);
    totalCollected += roboticsResult.collected;
    totalStored += roboticsResult.stored;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Collect mechatronics data (always include in feed cycle)
    const mechatronicsResult = await this.collectFromSource('mechatronics', DATA_SOURCES.mechatronics);
    totalCollected += mechatronicsResult.collected;
    totalStored += mechatronicsResult.stored;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Collect education data (always include in feed cycle)
    const educationResult = await this.collectFromSource('education', DATA_SOURCES.education);
    totalCollected += educationResult.collected;
    totalStored += educationResult.stored;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Collect technical documentation (always include in feed cycle)
    const techDocsResult = await this.collectFromSource('technical_docs', DATA_SOURCES.technical_docs);
    totalCollected += techDocsResult.collected;
    totalStored += techDocsResult.stored;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Collect specific web content periodically (less frequently)
    if (Math.random() < 0.3) { // 30% chance to collect web content
      const webResults = await this.collectWebContent(DATA_SOURCES.ai_research, 'ai-research');
      totalCollected += webResults.collected;
      totalStored += webResults.stored;

      await new Promise(resolve => setTimeout(resolve, 2000));

      const eduResults = await this.collectWebContent(DATA_SOURCES.education, 'education');
      totalCollected += eduResults.collected;
      totalStored += eduResults.stored;

      await new Promise(resolve => setTimeout(resolve, 2000));

      const techResults = await this.collectWebContent(DATA_SOURCES.technical_docs, 'technical-docs');
      totalCollected += techResults.collected;
      totalStored += techResults.stored;

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Collect from robotics sources
      const roboticsWebResults = await this.collectWebContent([
        'https://www.ros.org/documentation/',
        'https://gazebosim.org/docs',
        'https://www.mathworks.com/help/robotics/',
        'https://www.mathworks.com/help/control/',
        'https://www.mathworks.com/help/simulink/'
      ], 'robotics-software');
      totalCollected += roboticsWebResults.collected;
      totalStored += roboticsWebResults.stored;
    }

    const finalCount = await this.getStats();
    const cycleTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n📊 Feed cycle complete:`);
    console.log(`   ⏱️  Time: ${cycleTime}s`);
    console.log(`   📈 Collected: ${totalCollected} items`);
    console.log(`   💾 Stored: ${totalStored} items`);
    console.log(`   🧠 Knowledge Base: ${initialCount} → ${finalCount} entries`);
    console.log(`   📅 Next cycle in ${this.feedInterval / 1000 / 60} minutes\n`);
  }

  async start() {
    if (this.isRunning) {
      console.log('Data feeder is already running');
      return;
    }

    this.isRunning = true;
    console.log('🤖 CYRUS Data Feeder started');
    console.log(`🔄 Feed interval: ${this.feedInterval / 1000 / 60} minutes`);

    // Run initial feed cycle
    await this.runFeedCycle();

    // Set up periodic feeding
    setInterval(async () => {
      try {
        await this.runFeedCycle();
      } catch (error) {
        console.error('Feed cycle error:', error);
      }
    }, this.feedInterval);
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 CYRUS Data Feeder stopped');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const feeder = new DataFeeder();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down data feeder...');
    feeder.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down data feeder...');
    feeder.stop();
    process.exit(0);
  });

  // Start the feeder
  feeder.start().catch(error => {
    console.error('Failed to start data feeder:', error);
    process.exit(1);
  });
}

export default DataFeeder;