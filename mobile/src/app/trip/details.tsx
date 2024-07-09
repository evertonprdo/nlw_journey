import { Text, View } from "react-native";

export function TripDetails({ tripId }: {tripId: string}) {
    return (
        <View className="flex-1">
            <Text className="text-white">{tripId}</Text>
        </View>
    )    
}