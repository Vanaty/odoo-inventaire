import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress?: () => void;
}

export default function FeatureCard({ icon, iconColor, title, description, onPress }: FeatureCardProps) {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent style={styles.featureCard} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={iconColor} />
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      {onPress && (
        <Ionicons name="arrow-forward" size={20} color="#959595" />
      )}
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA', // grey
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000510', // darkmode
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238', // midnight_text
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666C78', // charcoalGray
    lineHeight: 20,
  },
});
