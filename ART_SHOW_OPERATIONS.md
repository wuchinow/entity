# Art Show Operations Guide - Entity v1.0
## Exhibition Day Procedures & Emergency Protocols

### Pre-Show Setup Checklist ✅

#### 24 Hours Before
- [ ] **System Health Check**: Run full diagnostic via admin panel
- [ ] **Content Verification**: Confirm all species have generated media
- [ ] **Backup Creation**: Export complete database and verify storage backups
- [ ] **Performance Test**: Load test the system with simulated traffic
- [ ] **Mobile Testing**: Test QR codes on multiple devices and browsers
- [ ] **Network Setup**: Coordinate with venue IT for stable internet connection

#### 2 Hours Before Opening
- [ ] **Final System Check**: Verify all services are operational
- [ ] **Switch to Exhibition Mode**: Enable looping mode with pre-generated content
- [ ] **QR Code Placement**: Position QR codes at optimal viewing locations
- [ ] **Admin Station Setup**: Prepare monitoring station with admin panel access
- [ ] **Emergency Contacts**: Confirm all support contacts are available
- [ ] **Backup Devices**: Ensure backup tablets/phones are charged and ready

---

## Exhibition Modes

### 1. Ambient Mode (Default)
**Best for**: Quiet periods, background ambiance
- Auto-cycles through species every 7 minutes
- No user interaction required
- Smooth, meditative progression
- **Admin Control**: Monitor via dashboard, minimal intervention

### 2. Interactive Mode
**Best for**: Busy periods, engaged visitors
- QR code access for mobile browsing
- Visitors can select specific species
- Combines auto-play with manual selection
- **Admin Control**: Monitor user engagement, assist with technical issues

### 3. Curator Mode
**Best for**: Special events, guided tours
- Manual species selection by curator
- Override auto-cycling for storytelling
- Highlight particularly striking species
- **Admin Control**: Full manual control via admin panel

---

## Real-Time Monitoring Dashboard

### Key Metrics to Watch
1. **System Health**
   - ✅ Database connectivity
   - ✅ Storage accessibility
   - ✅ API responsiveness
   - ⚠️ Error rates (should be <1%)

2. **Visitor Engagement**
   - 📱 QR code scans per hour
   - 👥 Concurrent gallery visitors
   - ⏱️ Average viewing time per species
   - 🔄 Manual species selections

3. **Performance Metrics**
   - 🚀 Page load times (<2 seconds)
   - 📊 Media loading speed
   - 💾 Storage bandwidth usage
   - 🔄 Cache hit rates

4. **Content Statistics**
   - 🎨 Most viewed species
   - 📈 Engagement patterns
   - 🕒 Peak usage times
   - 📱 Device type breakdown

---

## Visitor Interaction Protocols

### QR Code Experience
**Optimal Placement**:
- Eye level, well-lit areas
- Near but not blocking the main display
- Multiple locations for crowd distribution
- Clear instructions: "Scan to explore species"

**Mobile Experience**:
- Responsive design for all screen sizes
- Touch-friendly navigation
- Fast loading on cellular networks
- Offline capability for poor signal areas

### Visitor Assistance
**Common Questions & Responses**:

**Q**: "How do I use this?"
**A**: "Scan the QR code with your phone camera to browse extinct species, or simply watch the automatic display."

**Q**: "Can I download these images?"
**A**: "Yes! When viewing on your phone, you'll see download buttons for images and videos."

**Q**: "How are these created?"
**A**: "These are AI-generated visualizations of extinct species, created using historical data and advanced machine learning."

**Q**: "Is this real footage?"
**A**: "No, these are artistic AI interpretations of what these extinct animals might have looked like in life."

---

## Emergency Procedures

### Level 1: Minor Issues
**Symptoms**: Slow loading, occasional errors, minor display glitches
**Response Time**: Monitor, no immediate action needed
**Actions**:
- Note issue in monitoring log
- Check if problem resolves automatically
- Prepare for escalation if issues persist

### Level 2: Moderate Issues
**Symptoms**: Frequent errors, media not loading, QR codes not working
**Response Time**: 5 minutes
**Actions**:
1. Check admin panel for error details
2. Restart affected services via Vercel dashboard
3. Switch to backup display mode if needed
4. Notify technical support

### Level 3: Critical Issues
**Symptoms**: System completely down, database errors, total failure
**Response Time**: Immediate
**Actions**:
1. **Immediate**: Switch to backup display (static images/videos)
2. **Within 2 minutes**: Contact emergency technical support
3. **Within 5 minutes**: Implement manual slideshow if needed
4. **Ongoing**: Document issue for post-show analysis

### Emergency Contacts
- **Primary Technical**: [Your contact] - [Phone] - [Email]
- **Backup Technical**: [Craig's contact] - [Phone] - [Email]
- **Venue IT**: [Venue contact] - [Phone]
- **Exhibition Coordinator**: [Coordinator] - [Phone]

---

## Backup Procedures

### Automatic Backups
- **Database**: Daily snapshots via Supabase
- **Media Files**: Replicated in Supabase Storage
- **Configuration**: Environment variables backed up
- **Code**: GitHub repository with all changes

### Manual Backup Options
1. **Static Export**: Pre-generated HTML/media files
2. **Local Server**: Backup laptop with offline version
3. **USB Drive**: Complete media library for manual slideshow
4. **Cloud Storage**: Secondary storage in Google Drive/Dropbox

### Recovery Procedures
**Database Recovery**:
```bash
# Restore from Supabase backup
supabase db reset --db-url [backup-url]
```

**Media Recovery**:
```bash
# Re-sync from backup storage
npm run sync-media-backup
```

**Full System Recovery**:
```bash
# Deploy from GitHub backup
vercel --prod --force
```

---

## Performance Optimization

### Peak Traffic Handling
**Expected Load**: 50-100 concurrent visitors
**Optimization Strategies**:
- CDN caching for all media files
- Database connection pooling
- Lazy loading for images/videos
- Progressive web app caching

### Bandwidth Management
- **Images**: Optimized to <2MB each
- **Videos**: Compressed to <10MB each
- **Total Bandwidth**: Monitor and alert at 80% capacity
- **Fallback**: Reduce quality if bandwidth limited

---

## Visitor Analytics

### Data Collection (Privacy-Compliant)
- **Anonymous Usage**: No personal data collected
- **Interaction Patterns**: Species popularity, viewing duration
- **Technical Metrics**: Device types, connection speeds
- **Engagement Data**: QR scans, manual selections

### Real-Time Insights
- **Popular Species**: Which extinct animals draw most interest
- **Usage Patterns**: Peak times, average session length
- **Technical Performance**: Loading speeds, error rates
- **Mobile vs Desktop**: Device preference trends

---

## Post-Show Procedures

### Immediate (Within 1 Hour)
- [ ] **Data Export**: Download all analytics and usage data
- [ ] **System Backup**: Create final backup of all content
- [ ] **Performance Report**: Generate system performance summary
- [ ] **Issue Log**: Document any problems encountered

### Within 24 Hours
- [ ] **Visitor Feedback**: Compile any visitor comments or issues
- [ ] **Technical Analysis**: Review logs for optimization opportunities
- [ ] **Content Analysis**: Identify most/least popular species
- [ ] **Success Metrics**: Calculate uptime, engagement, performance stats

### Within 1 Week
- [ ] **Final Report**: Comprehensive exhibition analysis
- [ ] **Lessons Learned**: Document improvements for future shows
- [ ] **Archive Creation**: Preserve complete exhibition record
- [ ] **Thank You Notes**: Acknowledge all contributors and supporters

---

## Success Metrics

### Technical Success
- **Uptime**: >99% during exhibition hours
- **Performance**: <2 second load times
- **Error Rate**: <1% of all requests
- **Mobile Experience**: >95% successful QR scans

### Visitor Engagement
- **Interaction Rate**: >30% of visitors use QR codes
- **Session Duration**: >3 minutes average viewing time
- **Content Exploration**: >5 species viewed per session
- **Return Visits**: Visitors return to explore more

### Exhibition Impact
- **Visitor Satisfaction**: Positive feedback and engagement
- **Educational Value**: Increased awareness of extinction
- **Artistic Merit**: Recognition as innovative art/tech fusion
- **Technical Innovation**: Successful AI art exhibition model

---

## Contingency Plans

### Plan A: Full System Operational
- Normal exhibition mode with all features
- Real-time monitoring and optimization
- Full visitor interaction capabilities

### Plan B: Limited Functionality
- Basic display with reduced features
- Manual species selection only
- Simplified mobile experience

### Plan C: Backup Display
- Static slideshow of pre-generated content
- Manual advancement by curator
- Printed QR codes linking to static gallery

### Plan D: Emergency Fallback
- Laptop slideshow with best content
- Printed information cards
- Manual presentation by curator

---

*Remember: The goal is to create a seamless, engaging experience that honors extinct species while showcasing the power of AI art. Stay calm, monitor closely, and don't hesitate to ask for help.*

**Exhibition Success = Technical Stability + Visitor Engagement + Artistic Impact**