import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import jsPDF from "jspdf";

interface PDFExportProps {
  className?: string;
}

export function PDFExport({ className = "" }: PDFExportProps) {
  const currentRisk = useQuery(api.burnout.getCurrentRiskScore);
  const velocityMetrics = useQuery(api.linear.getVelocityMetrics, { days: 30 });
  const moodAnalytics = useQuery(api.webcam.getMoodAnalytics, { days: 7 });
  const workHours = useQuery(api.webcam.getWorkSessionAnalytics, { days: 7 });
  const burnoutHistory = useQuery(api.burnout.getBurnoutHistory, { days: 30 });

  // Debug logging
  console.log('PDF Export Data:', {
    currentRisk,
    velocityMetrics,
    moodAnalytics,
    workHours,
    burnoutHistory
  });

  const generatePDF = () => {
    console.log('Starting PDF generation...');
    console.log('Data available:', {
      currentRisk,
      velocityMetrics,
      moodAnalytics,
      workHours,
      burnoutHistory
    });

    // Create new PDF document
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add text with automatic line wrapping
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const maxWidth = pageWidth - x - 20;
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * (options.lineHeight || 7));
    };

    // Helper function to add a section header
    const addSectionHeader = (text: string, y: number) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      
      // Add space before section
      y += 8;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55); // Gray-800
      const newY = addText(text, 20, y, { lineHeight: 6 });
      
      // Add underline
      doc.setLineWidth(1);
      doc.setDrawColor(59, 130, 246); // Blue-500
      doc.line(20, newY + 2, pageWidth - 20, newY + 2);
      
      return newY + 8;
    };

    // Helper function to add a data box
    const addDataBox = (title: string, value: string, x: number, y: number, width: number, height: number) => {
      // Box background
      doc.setFillColor(248, 250, 252); // Gray-50
      doc.roundedRect(x, y, width, height, 4, 4, 'F');
      
      // Box border
      doc.setLineWidth(1);
      doc.setDrawColor(59, 130, 246); // Blue-500
      doc.roundedRect(x, y, width, height, 4, 4, 'S');
      
      // Title background
      doc.setFillColor(75, 85, 99); // Dark gray
      doc.roundedRect(x, y, width, 5, 3, 3, 'F');
      
      // Title
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255); // White
      const titleLines = doc.splitTextToSize(title, width - 4);
      doc.text(titleLines, x + 2, y + 3.5);
      
      // Value
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55); // Dark gray
      const valueLines = doc.splitTextToSize(value, width - 4);
      doc.text(valueLines, x + 2, y + 14);
    };

    try {
      // Professional Header with Logo Area
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55); // Dark Gray
      addText('OCCUPATIONAL HEALTH ASSESSMENT', 20, yPosition);
      
      yPosition += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      addText('Burnout Risk Evaluation Report', 20, yPosition);
      
      yPosition += 12;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      addText(`Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPosition);
      yPosition += 4;
      addText(`Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 20, yPosition);
      yPosition += 4;
      addText('Assessment Period: 30 Days', 20, yPosition);
      
      yPosition += 10;

      // Professional divider
      doc.setLineWidth(0.5);
      doc.setDrawColor(156, 163, 175);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 12;

      // Executive Summary Box
      doc.setFillColor(249, 250, 251);
      doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.rect(20, yPosition, pageWidth - 40, 25, 'S');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      addText('EXECUTIVE SUMMARY', 25, yPosition + 6);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      addText('This report provides a comprehensive assessment of occupational stress indicators', 25, yPosition + 12);
      addText('and burnout risk factors based on continuous monitoring and data analysis.', 25, yPosition + 17);
      
      yPosition += 32;

      // Current Risk Score Section
      yPosition = addSectionHeader('I. BURNOUT RISK ASSESSMENT', yPosition);
      
      if (currentRisk) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        const riskLevel = formatRiskLevel(currentRisk.riskScore);
        
        // Professional risk assessment box
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, pageWidth - 40, 45, 'F');
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.5);
        doc.rect(20, yPosition, pageWidth - 40, 45, 'S');
        
        // Risk Score - Left side
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        addText('Overall Risk Score:', 25, yPosition + 8);
        
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        addText(`${currentRisk.riskScore}%`, 25, yPosition + 22);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const levelColor = riskLevel.level === 'High' ? [220, 38, 38] : riskLevel.level === 'Medium' ? [217, 119, 6] : [22, 163, 74];
        doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
        addText(`${riskLevel.level.toUpperCase()} RISK`, 25, yPosition + 30);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        addText('Classification based on composite', 25, yPosition + 36);
        addText('stress indicators', 25, yPosition + 40);
        
        // Risk Factors Table - Right side
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        addText('Contributing Factors:', 95, yPosition + 8);
        
        const factors = [
          { name: 'Work Velocity', score: currentRisk.factors?.velocityScore || 0 },
          { name: 'Emotional State', score: currentRisk.factors?.moodScore || 0 },
          { name: 'Work Duration', score: currentRisk.factors?.workHoursScore || 0 },
          { name: 'Rest Intervals', score: currentRisk.factors?.breakScore || 0 }
        ];
        
        if (currentRisk.factors?.commitPatternsScore) {
          factors.push({ name: 'Activity Patterns', score: currentRisk.factors.commitPatternsScore });
        }
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let factorY = yPosition + 14;
        factors.forEach(factor => {
          doc.setTextColor(75, 85, 99);
          addText(`${factor.name}:`, 95, factorY);
          
          // Score bar
          const barWidth = 40;
          const fillWidth = (factor.score / 100) * barWidth;
          doc.setFillColor(229, 231, 235);
          doc.rect(140, factorY - 3, barWidth, 4, 'F');
          
          const barColor = factor.score >= 70 ? [220, 38, 38] : factor.score >= 50 ? [217, 119, 6] : [22, 163, 74];
          doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.rect(140, factorY - 3, fillWidth, 4, 'F');
          
          doc.setTextColor(31, 41, 55);
          addText(`${factor.score}%`, 183, factorY);
          factorY += 6;
        });
        
        yPosition += 52;
      } else {
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        addText('No risk data available. Connect your integrations to see your burnout risk score.', 20, yPosition);
        yPosition += 20;
      }
      
      yPosition += 12;

      // Add section divider
      doc.setLineWidth(0.5);
      doc.setDrawColor(229, 231, 235); // Gray-200
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      // Additional Data Sections
      if (velocityMetrics) {
        // Check if we need a new page for this section (header + boxes need ~45mm)
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('II. PRODUCTIVITY METRICS', yPosition);
        
        const metrics = [
          { title: 'Total Points', value: `${velocityMetrics.totalPoints || 0}` },
          { title: 'Average Velocity', value: `${(velocityMetrics.averageVelocity || 0).toFixed(1)}` },
          { title: 'Current Trend', value: `${(velocityMetrics.currentTrend || 0) >= 0 ? '+' : ''}${(velocityMetrics.currentTrend || 0).toFixed(1)}` }
        ];
        
        // Don't add extra page break - section header already checked
        
        // Calculate box positions to fit within page width - smaller boxes
        const boxWidth = 45;
        const boxHeight = 22;
        const boxSpacing = 8;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (pageWidth - totalWidth) / 2;
        
        metrics.forEach((metric, index) => {
          const x = startX + index * (boxWidth + boxSpacing);
          addDataBox(metric.title, metric.value, x, yPosition, boxWidth, boxHeight);
        });
        
        yPosition += 30;
      }

      // Add section divider
      if (velocityMetrics) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }

      if (workHours) {
        // Check if we need a new page for this section (header + boxes need ~45mm)
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('III. WORK PATTERN ANALYSIS', yPosition);
        
        const workMetrics = [
          { title: 'Total Hours', value: `${workHours.totalHours || 0}h` },
          { title: 'Average/Day', value: `${workHours.averageHours || 0}h` },
          { title: 'Active Sessions', value: `${workHours.activeSessions || 0}` }
        ];
        
        // Don't add extra page break - section header already checked
        
        // Calculate box positions to fit within page width - smaller boxes
        const boxWidth = 45;
        const boxHeight = 22;
        const boxSpacing = 8;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (pageWidth - totalWidth) / 2;
        
        workMetrics.forEach((metric, index) => {
          const x = startX + index * (boxWidth + boxSpacing);
          addDataBox(metric.title, metric.value, x, yPosition, boxWidth, boxHeight);
        });
        
        yPosition += 30;
      }

      // Add section divider
      if (workHours) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }

      if (moodAnalytics) {
        // Check if we need a new page for this section
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('IV. PSYCHOLOGICAL INDICATORS', yPosition);
        
        // Professional table-like layout
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, pageWidth - 40, 35, 'F');
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.5);
        doc.rect(20, yPosition, pageWidth - 40, 35, 'S');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        addText('Monitoring Summary:', 25, yPosition + 8);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        
        // Data points
        addText(`Total Observations: ${moodAnalytics.totalDataPoints || 0}`, 25, yPosition + 15);
        
        // Latest mood with proper handling
        if (moodAnalytics.currentMood && moodAnalytics.currentMood.mood && moodAnalytics.currentMood.mood !== 'undefined') {
          const mood = moodAnalytics.currentMood.mood;
          const moodScore = moodAnalytics.currentMood.moodScore || 0;
          const confidence = ((moodAnalytics.currentMood.confidence || 0) * 100).toFixed(1);
          
          addText(`Current State: ${mood.charAt(0).toUpperCase() + mood.slice(1)} (Score: ${moodScore}%)`, 25, yPosition + 21);
          addText(`Assessment Confidence: ${confidence}%`, 25, yPosition + 27);
        } else {
          doc.setTextColor(107, 114, 128);
          addText('Current State: Insufficient data for assessment', 25, yPosition + 21);
          addText('Note: Webcam monitoring required for mood analysis', 25, yPosition + 27);
        }
        
        yPosition += 42;
      }

      // Add section divider
      if (moodAnalytics) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 8;
      }

      // Burnout History Section
      if (burnoutHistory && burnoutHistory.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }
        
        yPosition = addSectionHeader('Burnout History (Last 30 Days)', yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        
        // Show last 7 entries
        const recentHistory = burnoutHistory.slice(0, 7);
        recentHistory.forEach((score, index) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          
          const riskColor = formatRiskLevel(score.riskScore).color;
          const riskRgb = riskColor === '#dc2626' ? [220, 38, 38] : riskColor === '#f59e0b' ? [245, 158, 11] : [16, 185, 129];
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          addText(score.date, 20, yPosition);
          
          doc.setTextColor(riskRgb[0], riskRgb[1], riskRgb[2]);
          addText(`${score.riskScore}% (${formatRiskLevel(score.riskScore).level})`, pageWidth - 60, yPosition);
          
          yPosition += 8;
        });
        
        yPosition += 15;
      }

      // Add major section divider before features
      doc.setLineWidth(1);
      doc.setDrawColor(156, 163, 175); // Gray-400
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 20;

      // TouchGrass Features Section
      // Check if we need a new page for features section BEFORE adding header
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 20;
      }
      
      yPosition = addSectionHeader('TouchGrass Features', yPosition);
      
      const features = [
        { title: 'Real-time Monitoring', desc: 'Track burnout risk with live data from Linear, GitHub, and webcam monitoring' },
        { title: 'Smart Alerts', desc: 'Get notified when it\'s time to take a break and touch grass' },
        { title: 'Analytics Dashboard', desc: 'Visualize work patterns and productivity trends' },
        { title: 'Export Reports', desc: 'Generate PDF reports for managers and health professionals' }
      ];
      
      // Layout features in 2x2 grid with proper spacing - larger boxes
      const boxWidth = 85;
      const boxHeight = 40;
      const spacing = 10;
      const startX = 20;
      
      // Calculate total height needed for all features
      const totalRows = Math.ceil(features.length / 2);
      const totalHeight = (totalRows * boxHeight) + ((totalRows - 1) * spacing);
      
      // If not enough space, move to new page
      if (yPosition + totalHeight > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      features.forEach((feature, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = startX + col * (boxWidth + spacing);
        const y = yPosition + row * (boxHeight + spacing);
        
        // Feature box background
        doc.setFillColor(249, 250, 251); // Light gray
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');
        
        // Feature box border
        doc.setLineWidth(0.5);
        doc.setDrawColor(209, 213, 219); // Gray border
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'S');
        
        // Feature title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55); // Dark gray
        const titleLines = doc.splitTextToSize(feature.title, boxWidth - 12);
        doc.text(titleLines, x + 6, y + 10);
        
        // Feature description - wrap text properly
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99); // Medium gray
        const descLines = doc.splitTextToSize(feature.desc, boxWidth - 12);
        doc.text(descLines, x + 6, y + 19);
      });
      
      yPosition += totalHeight + 10;

      // Add section divider before recommendations
      doc.setLineWidth(1);
      doc.setDrawColor(156, 163, 175); // Gray-400
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 20;

      // Check if we need a new page for recommendations
      if (yPosition > pageHeight - 150) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Recommendations Section
      yPosition = addSectionHeader('Burnout Prevention Recommendations', yPosition);
      
      const recommendations = [
        'Take regular breaks every 25-30 minutes (Pomodoro Technique)',
        'Step away from your computer for at least 5 minutes every hour',
        'Go outside and touch some grass! Fresh air helps reset your mind',
        'Maintain work-life balance by setting clear boundaries',
        'Stay hydrated and maintain proper posture',
        'Consider adjusting your workload if risk scores remain high',
        'Practice mindfulness or meditation during breaks',
        'Ensure adequate sleep (7-9 hours per night)'
      ];
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      
      recommendations.forEach((rec, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        
        addText(`• ${rec}`, 20, yPosition);
        yPosition += 7;
      });
      
      yPosition += 15;

      // Footer
      doc.setLineWidth(0.5);
      doc.setDrawColor(229, 231, 235);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      addText('Generated by TouchGrass - Developer Burnout Prevention System', 20, yPosition);
      yPosition += 5;
      addText('Keep coding sustainably!', 20, yPosition);

      // Save the PDF
      const filename = `TouchGrass-Burnout-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      
      console.log('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatRiskLevel = (score: number) => {
    if (score >= 75) return { level: 'High', color: '#dc2626' };
    if (score >= 50) return { level: 'Medium', color: '#f59e0b' };
    return { level: 'Low', color: '#10b981' };
  };


  return (
    <div>
      {/* Export Button */}
      <button
        onClick={generatePDF}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
        disabled={!currentRisk}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export PDF Report
      </button>

    </div>
  );
}
